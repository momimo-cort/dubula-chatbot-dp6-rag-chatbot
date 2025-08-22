import os
from dotenv import load_dotenv
load_dotenv()

from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.chains.query_constructor.base import AttributeInfo
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.memory import ConversationTokenBufferMemory
from langchain_core.prompts import MessagesPlaceholder
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain_openai.chat_models import ChatOpenAI
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.vectorstores import Milvus

class RAG():
    def __init__(self, config: dict = None):
        self.config = config or {}
        
        # Extract configuration values with defaults
        docs_dir = self.config.get('docs_dir', '/app/docs')
        n_retrievals = self.config.get('n_retrievals', 4)
        chat_max_tokens = self.config.get('chat_max_tokens', 3097)
        model_name = self.config.get('model_name', 'gpt-3.5-turbo')
        creativeness = self.config.get('creativeness', 0.7)
        
        self.__model = self.__set_llm_model(model_name, creativeness)
        self.__docs_list = self.__get_docs_list(docs_dir)
        self.__retriever = self.__set_retriever(k=n_retrievals)
        self.__chat_history = self.__set_chat_history(max_token_limit=chat_max_tokens)


    # PRIVATE METHODS #
    def __set_llm_model(self, model_name = "gpt-3.5-turbo", temperature: float = 0.7):
        return ChatOpenAI(model_name=model_name, temperature=temperature)
    
    def __get_docs_list(self, docs_dir: str) -> list:
        print("Loading Documents...")
        loader = DirectoryLoader(docs_dir,
                                 recursive=True,
                                 show_progress=True,
                                 use_multithreading=True,
                                 max_concurrency=4)
        docs_list = loader.load_and_split()
       
        return docs_list
    
    def __set_retriever(self, k: int = 4):
        # Milvus Vector Store - connect to external Milvus container
        embeddings = OpenAIEmbeddings()
        # Remove milvus_server.start() since we're using external Milvus
        vector_store = Milvus.from_documents(
            self.__docs_list,
            embedding=embeddings,
            connection_args={"host": os.getenv("MILVUS_HOST", "localhost"), "port": os.getenv("MILVUS_PORT", "19530")},
            collection_name="training_documents",
        )

        # Self-Querying Retriever
        metadata_field_info = [
            AttributeInfo(
                name="source",
                description="The directory path where the document is located",
                type="string",
            ),
        ]

        document_content_description = "Restaurant training documents containing information about various restaurants, their menus, and other relevant details."

        _retriever = SelfQueryRetriever.from_llm(
            self.__model,
            vector_store,
            document_content_description,
            metadata_field_info,
            search_kwargs={"k": k}
        )

        return _retriever
    
    def __set_chat_history(self, max_token_limit: int = 3097):
        return ConversationTokenBufferMemory(llm=self.__model, max_token_limit=max_token_limit, return_messages=True)
    
    def _generate_dynamic_prompt(self, bot_name: str, personality: dict, brand_voice: dict, response_settings: dict) -> str:
        """Generate dynamic system prompt based on assistant configuration"""
        
        # Base assistant identity
        prompt_parts = [f"You are {bot_name}, a restaurant service training assistant."]
        
        # Add brand voice description
        if brand_voice.get('description'):
            prompt_parts.append(f"You are {brand_voice['description']}.")
        else:
            prompt_parts.append("Provide detailed, actionable advice to restaurant staff.")
        
        # Add personality-based instructions
        tone = personality.get('tone', 'helpful')
        style = personality.get('style', 'conversational')
        formality = personality.get('formality', 'balanced')
        
        personality_instruction = f"Maintain a {tone} tone with a {style} style at a {formality} level of formality."
        prompt_parts.append(personality_instruction)
        
        # Response guidelines section
        guidelines = ["Response Guidelines:"]
        
        # Length-based guidelines
        max_length = response_settings.get('maxLength', 'medium')
        if max_length == 'comprehensive':
            guidelines.append("- Provide comprehensive, detailed answers with extensive examples and explanations")
        elif max_length == 'medium':
            guidelines.append("- Provide thorough answers with relevant examples when helpful")
        else:  # brief
            guidelines.append("- Provide concise, focused answers that directly address the question")
        
        # Include examples setting
        if response_settings.get('includeExamples', True):
            guidelines.append("- Include specific, practical steps and actionable recommendations")
        
        # Follow-up questions setting
        if response_settings.get('askFollowUpQuestions', True):
            guidelines.append("- Ask relevant follow-up questions when appropriate to provide better assistance")
        
        # Key traits from brand voice
        if brand_voice.get('keyTraits'):
            traits_str = ', '.join(brand_voice['keyTraits'])
            guidelines.append(f"- Embody these key characteristics: {traits_str}")
        
        # Do's list
        if brand_voice.get('dosList'):
            guidelines.append("- DO:")
            for do_item in brand_voice['dosList']:
                guidelines.append(f"  • {do_item}")
        
        # Don'ts list
        if brand_voice.get('dontsList'):
            guidelines.append("- DON'T:")
            for dont_item in brand_voice['dontsList']:
                guidelines.append(f"  • {dont_item}")
        
        # Sample phrases for reference
        if brand_voice.get('samplePhrases'):
            guidelines.append("- Consider using phrases like:")
            for phrase in brand_voice['samplePhrases'][:3]:  # Limit to 3 examples
                guidelines.append(f"  • \"{phrase}\"")
        
        # Standard guidelines
        guidelines.extend([
            f"- Always refer to yourself as \"{bot_name}\" when providing responses",
            "- Always include reasoning behind your recommendations",
            "- Break down complex procedures into clear, sequential steps",
            "- Where applicable, mention both what to do and what to avoid",
            "- If the question can't be answered with the given context, state this clearly and provide general best practices instead"
        ])
        
        # Combine all parts
        prompt_parts.append('\n'.join(guidelines))
        prompt_parts.append("Based on the context below, answer accordingly:\n\n{context}")
        
        return '\n\n'.join(prompt_parts)

    # PUBLIC METHODS #
    def ask(self, question: str) -> str:
        # Get bot configuration
        bot_name = self.config.get('branding', {}).get('botName', 'Dubula')
        personality = self.config.get('assistant', {}).get('personality', {})
        brand_voice = self.config.get('assistant', {}).get('brandVoice', {})
        response_settings = self.config.get('assistant', {}).get('responseSettings', {})
        
        # Generate dynamic prompt based on configuration
        prompt_string = self._generate_dynamic_prompt(bot_name, personality, brand_voice, response_settings)
        prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_string),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
        ])
       
        output_parser = StrOutputParser()
        chain = prompt | self.__model | output_parser
        answer = chain.invoke({
            "input": question,
            "chat_history": self.__chat_history.load_memory_variables({})['history'],
            "context": self.__retriever.get_relevant_documents(question)
        })

        # Atualização do histórico de conversa
        self.__chat_history.save_context({"input": question}, {"output": answer})
       
        return answer
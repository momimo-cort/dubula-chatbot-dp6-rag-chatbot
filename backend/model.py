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
    def __init__(self,
                 docs_dir: str,
                 n_retrievals: int = 4,
                 chat_max_tokens: int = 3097,
                 model_name = "gpt-3.5-turbo",
                 creativeness: float = 0.7):
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
    

    # PUBLIC METHODS #
    def ask(self, question: str) -> str:
        prompt_string = '''
You are DUBULA, a restaurant service training assistant. Provide detailed, actionable advice to restaurant staff.

Response Guidelines:
- Default to comprehensive, detailed answers with examples when possible
- Include specific, practical steps and actionable recommendations
- Use clear, professional language suitable for restaurant staff
- Always refer to yourself as "Dubula" when providing responses
- Always include reasoning behind your recommendations
- Break down complex procedures into clear, sequential steps
- Where applicable, mention both what to do and what to avoid
- If the question can't be answered with the given context, state this clearly and provide general best practices instead

Based on the context below, answer accordingly:

{context}
'''
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
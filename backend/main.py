from model import RAG

rag = RAG(
    docs_dir='/app/docs', # Directory name where documents are stored
    n_retrievals=4, # Number of documents returned by search (int)  :   default=4
    chat_max_tokens=3097, # Maximum number of tokens that can be used in chat memory (int)  :   default=3097
    creativeness=1.2, # How creative the response will be (float 0-2)  :   default=0.7
)

print("\nType 'exit' to quit the program.")
print("DEBUG: Starting chat loop...")
while True:
    print("DEBUG: About to prompt for input...")
    question = str(input("Question: "))
    print(f"DEBUG: Received question: '{question}'")
    if question == "exit":
        print("DEBUG: Exit command received, breaking loop...")
        break
    print("DEBUG: Processing question with RAG...")
    answer = rag.ask(question)
    print('Answer:', answer)
    print("DEBUG: Loop iteration complete.")
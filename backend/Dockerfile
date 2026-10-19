FROM python:3.10-slim

WORKDIR /code

# Configure HuggingFace cache to writable temporary directory for HF Spaces (User 1000)
ENV HF_HOME=/tmp/huggingface
ENV TRANSFORMERS_CACHE=/tmp/huggingface

# Install dependencies
COPY requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application files and data
COPY . /code

# Give full read/write permissions for local vector database creation
RUN chmod -R 777 /code

# Hugging Face Spaces requires services to run on port 7860
EXPOSE 7860

# Start Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
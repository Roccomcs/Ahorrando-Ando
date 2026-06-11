install:
	poetry install

dev:
	uvicorn src.interfaces.http.app:app --reload --port 8000

migrate:
	alembic upgrade head

migration:
	alembic revision --autogenerate -m "$(name)"

test:
	pytest tests/ --cov=src --cov-report=term-missing

lint:
	ruff check src/
	ruff format src/

shell:
	poetry shell

generate-key:
	python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

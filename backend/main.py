from fastapi import FastAPI, Depends, HTTPException, status
from sqlmodel import Field, Session, SQLModel, create_engine, select
from typing import Optional, List
from datetime import datetime
from pydantic import constr
import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://wp:wp@postgres-service:5432/finance_tracker_db"
)

engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables():
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    print("Database tables created.")


def get_session():
    with Session(engine) as session:
        yield session


class CategoryBase(SQLModel):
    name: str = Field(index=True, unique=True)


class CategoryCreate(CategoryBase):
    pass


class Category(CategoryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class TransactionBase(SQLModel):
    amount: float
    type: constr(pattern="^(income|expense)$")
    description: Optional[str] = None
    transaction_date: datetime = Field(default_factory=datetime.utcnow)


class TransactionCreate(TransactionBase):
    category_id: int


class Transaction(TransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="category.id")


app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://finance.local",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# --- API Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "OK"}

@app.post("/categories/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryCreate, session: Session = Depends(get_session)):

    existing_category = session.exec(select(Category).where(Category.name == category.name)).first()
    if existing_category:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    db_category = Category(name=category.name)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


@app.get("/categories/", response_model=List[Category])
def read_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category)).all()
    return categories


@app.put("/categories/{category_id}", response_model=Category)
def update_category(category_id: int, category: CategoryCreate, session: Session = Depends(get_session)):
    db_category = session.exec(select(Category).where(Category.id == category_id)).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.name != db_category.name:
        existing_category = session.exec(select(Category).where(Category.name == category.name)).first()
        if existing_category:
            raise HTTPException(status_code=400, detail="Category with this name already exists")

    db_category.name = category.name
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


@app.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, session: Session = Depends(get_session)):
    db_category = session.exec(select(Category).where(Category.id == category_id)).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    session.delete(db_category)
    session.commit()
    return

@app.post("/transactions/", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: TransactionCreate, session: Session = Depends(get_session)):

    category = session.exec(select(Category).where(Category.id == transaction.category_id)).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    db_transaction = Transaction(
        amount=transaction.amount,
        type=transaction.type,
        description=transaction.description,
        category_id=transaction.category_id
    )
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction


@app.get("/transactions/", response_model=List[Transaction])
def read_transactions(session: Session = Depends(get_session)):
    transactions = session.exec(select(Transaction)).all()
    return transactions


@app.put("/transactions/{transaction_id}", response_model=Transaction)
def update_transaction(
        transaction_id: int,
        transaction: TransactionCreate,
        session: Session = Depends(get_session)
):
    db_transaction = session.exec(select(Transaction).where(Transaction.id == transaction_id)).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")


    if transaction.category_id and transaction.category_id != db_transaction.category_id:
        category = session.exec(select(Category).where(Category.id == transaction.category_id)).first()
        if not category:
            raise HTTPException(status_code=400, detail="New category not found")
        db_transaction.category_id = transaction.category_id

    db_transaction.amount = transaction.amount
    db_transaction.type = transaction.type
    db_transaction.description = transaction.description
    db_transaction.transaction_date = transaction.transaction_date

    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction


@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    db_transaction = session.exec(select(Transaction).where(Transaction.id == transaction_id)).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    session.delete(db_transaction)
    session.commit()
    return


@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Finance Tracker API"}
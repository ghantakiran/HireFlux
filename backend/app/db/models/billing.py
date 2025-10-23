"""Billing models: CreditWallet, CreditLedger, Subscription"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class CreditWallet(Base):
    """User credit balance"""
    __tablename__ = "credit_wallets"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    balance = Column(Integer, default=0)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_wallet")


class CreditLedger(Base):
    """Credit transaction history"""
    __tablename__ = "credit_ledger"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer)  # Positive for credit, negative for debit
    transaction_type = Column(String(50))  # 'purchase', 'apply', 'refund'
    reason = Column(Text)
    application_id = Column(GUID(), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_ledger")


class Subscription(Base):
    """User subscription plans"""
    __tablename__ = "subscriptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stripe_subscription_id = Column(String(255), unique=True)
    plan = Column(String(50), default='free')  # 'free', 'plus', 'pro'
    status = Column(String(50), default='active')  # 'active', 'canceled', 'past_due'
    current_period_start = Column(TIMESTAMP)
    current_period_end = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")

"""Credit wallet management service"""
import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationError
from app.db.models.billing import CreditWallet, CreditLedger
from app.schemas.billing import CreditTransaction, CreditWalletResponse


class CreditService:
    """Credit wallet operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_wallet(self, user_id: uuid.UUID) -> CreditWalletResponse:
        """Get user's credit wallet"""
        wallet = (
            self.db.query(CreditWallet).filter(CreditWallet.user_id == user_id).first()
        )

        if not wallet:
            # Create wallet with free tier defaults
            wallet = CreditWallet(
                id=uuid.uuid4(),
                user_id=user_id,
                ai_credits=0,
                cover_letter_credits=3,
                auto_apply_credits=0,
                job_suggestion_credits=10,
            )
            self.db.add(wallet)
            self.db.commit()
            self.db.refresh(wallet)

        return CreditWalletResponse(
            user_id=str(wallet.user_id),
            ai_credits=wallet.ai_credits,
            cover_letter_credits=wallet.cover_letter_credits,
            auto_apply_credits=wallet.auto_apply_credits,
            job_suggestion_credits=wallet.job_suggestion_credits,
            total_earned=wallet.total_earned,
            total_spent=wallet.total_spent,
            last_reset=wallet.last_reset,
        )

    def deduct_credits(
        self,
        user_id: uuid.UUID,
        credit_type: str,
        amount: int,
        description: str,
        reference_id: Optional[uuid.UUID] = None,
    ) -> bool:
        """Deduct credits from wallet"""
        wallet = (
            self.db.query(CreditWallet).filter(CreditWallet.user_id == user_id).first()
        )

        if not wallet:
            raise ValidationError("Credit wallet not found")

        # Validate credit type
        valid_types = ["ai", "cover_letter", "auto_apply", "job_suggestion"]
        if credit_type not in valid_types:
            raise ValidationError(f"Invalid credit type: {credit_type}")

        # Check balance
        credit_field = f"{credit_type}_credits"
        current_balance = getattr(wallet, credit_field, 0)

        if current_balance == -1:  # Unlimited
            # Log transaction but don't deduct
            self._log_transaction(
                user_id=user_id,
                credit_type=credit_type,
                amount=-amount,
                balance_after=-1,
                operation="deduct",
                description=f"{description} (unlimited plan)",
                reference_id=reference_id,
            )
            return True

        if current_balance < amount:
            raise ValidationError(
                f"Insufficient {credit_type} credits. "
                f"Required: {amount}, Available: {current_balance}"
            )

        # Deduct credits
        new_balance = current_balance - amount
        setattr(wallet, credit_field, new_balance)
        wallet.total_spent += amount
        wallet.updated_at = datetime.utcnow()

        # Log transaction
        self._log_transaction(
            user_id=user_id,
            credit_type=credit_type,
            amount=-amount,
            balance_after=new_balance,
            operation="deduct",
            description=description,
            reference_id=reference_id,
        )

        self.db.commit()
        return True

    def add_credits(
        self,
        user_id: uuid.UUID,
        credit_type: str,
        amount: int,
        description: str,
        reference_id: Optional[uuid.UUID] = None,
    ):
        """Add credits to wallet"""
        wallet = (
            self.db.query(CreditWallet).filter(CreditWallet.user_id == user_id).first()
        )

        if not wallet:
            raise ValidationError("Credit wallet not found")

        # Validate credit type
        valid_types = ["ai", "cover_letter", "auto_apply", "job_suggestion"]
        if credit_type not in valid_types:
            raise ValidationError(f"Invalid credit type: {credit_type}")

        credit_field = f"{credit_type}_credits"
        current_balance = getattr(wallet, credit_field, 0)

        # Don't add to unlimited balance
        if current_balance == -1:
            self._log_transaction(
                user_id=user_id,
                credit_type=credit_type,
                amount=amount,
                balance_after=-1,
                operation="add",
                description=f"{description} (unlimited plan - not applied)",
                reference_id=reference_id,
            )
            return

        # Add credits
        new_balance = current_balance + amount
        setattr(wallet, credit_field, new_balance)
        wallet.total_earned += amount
        wallet.updated_at = datetime.utcnow()

        # Log transaction
        self._log_transaction(
            user_id=user_id,
            credit_type=credit_type,
            amount=amount,
            balance_after=new_balance,
            operation="add",
            description=description,
            reference_id=reference_id,
        )

        self.db.commit()

    def refund_credits(
        self,
        user_id: uuid.UUID,
        credit_type: str,
        amount: int,
        reason: str,
        reference_id: Optional[uuid.UUID] = None,
    ):
        """Refund credits (add back with refund operation)"""
        wallet = (
            self.db.query(CreditWallet).filter(CreditWallet.user_id == user_id).first()
        )

        if not wallet:
            raise ValidationError("Credit wallet not found")

        # Validate credit type
        valid_types = ["ai", "cover_letter", "auto_apply", "job_suggestion"]
        if credit_type not in valid_types:
            raise ValidationError(f"Invalid credit type: {credit_type}")

        credit_field = f"{credit_type}_credits"
        current_balance = getattr(wallet, credit_field, 0)

        # Skip if unlimited
        if current_balance == -1:
            self._log_transaction(
                user_id=user_id,
                credit_type=credit_type,
                amount=amount,
                balance_after=-1,
                operation="refund",
                description=f"Refund: {reason} (unlimited plan - not applied)",
                reference_id=reference_id,
            )
            return

        # Refund credits
        new_balance = current_balance + amount
        setattr(wallet, credit_field, new_balance)
        wallet.total_spent = max(0, wallet.total_spent - amount)
        wallet.updated_at = datetime.utcnow()

        # Log transaction
        self._log_transaction(
            user_id=user_id,
            credit_type=credit_type,
            amount=amount,
            balance_after=new_balance,
            operation="refund",
            description=f"Refund: {reason}",
            reference_id=reference_id,
        )

        self.db.commit()

    def get_transaction_history(
        self, user_id: uuid.UUID, credit_type: Optional[str] = None, limit: int = 50
    ) -> List[CreditTransaction]:
        """Get credit transaction history"""
        query = self.db.query(CreditLedger).filter(CreditLedger.user_id == user_id)

        if credit_type:
            query = query.filter(CreditLedger.credit_type == credit_type)

        transactions = query.order_by(CreditLedger.created_at.desc()).limit(limit).all()

        return [
            CreditTransaction(
                id=str(t.id),
                user_id=str(t.user_id),
                operation=t.operation,
                credit_type=t.credit_type,
                amount=t.amount,
                balance_after=t.balance_after,
                description=t.description,
                reference_id=str(t.reference_id) if t.reference_id else None,
                created_at=t.created_at,
            )
            for t in transactions
        ]

    def check_sufficient_credits(
        self, user_id: uuid.UUID, credit_type: str, amount: int
    ) -> bool:
        """Check if user has sufficient credits"""
        wallet = (
            self.db.query(CreditWallet).filter(CreditWallet.user_id == user_id).first()
        )

        if not wallet:
            return False

        # Validate credit type
        valid_types = ["ai", "cover_letter", "auto_apply", "job_suggestion"]
        if credit_type not in valid_types:
            return False

        credit_field = f"{credit_type}_credits"
        current_balance = getattr(wallet, credit_field, 0)

        # Unlimited or sufficient balance
        return current_balance == -1 or current_balance >= amount

    def _log_transaction(
        self,
        user_id: uuid.UUID,
        credit_type: str,
        amount: int,
        balance_after: int,
        operation: str,
        description: str,
        reference_id: Optional[uuid.UUID] = None,
    ):
        """Log credit transaction to ledger"""
        ledger_entry = CreditLedger(
            id=uuid.uuid4(),
            user_id=user_id,
            credit_type=credit_type,
            amount=amount,
            balance_after=balance_after,
            operation=operation,
            description=description,
            reference_id=reference_id,
        )
        self.db.add(ledger_entry)

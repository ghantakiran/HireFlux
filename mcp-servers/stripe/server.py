"""
Stripe MCP Server for HireFlux
Payment and subscription management with metered billing
"""
import os
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime
import stripe
from mcp import Server, Tool

class StripeMCPServer:
    def __init__(self):
        self.server = Server("stripe")
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        self.register_tools()

    def register_tools(self):
        """Register Stripe tools"""

        @self.server.tool()
        async def create_subscription(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Create subscription for user

            Args:
                params:
                    customer_id: str - Stripe customer ID
                    price_id: str - Stripe price ID
                    trial_days: Optional[int] - Trial period
                    metadata: Optional[Dict] - Additional metadata

            Returns:
                {
                    subscription_id: str,
                    status: str,
                    current_period_end: str
                }
            """
            customer_id = params["customer_id"]
            price_id = params["price_id"]
            trial_days = params.get("trial_days")
            metadata = params.get("metadata", {})

            try:
                sub_params = {
                    "customer": customer_id,
                    "items": [{"price": price_id}],
                    "metadata": metadata
                }

                if trial_days:
                    sub_params["trial_period_days"] = trial_days

                subscription = stripe.Subscription.create(**sub_params)

                return {
                    "subscription_id": subscription.id,
                    "status": subscription.status,
                    "current_period_end": datetime.fromtimestamp(
                        subscription.current_period_end
                    ).isoformat()
                }
            except stripe.error.StripeError as e:
                return {"error": str(e)}

        @self.server.tool()
        async def report_usage(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Report metered usage for subscription

            Args:
                params:
                    subscription_item: str - Subscription item ID
                    quantity: int - Usage quantity
                    action: str - "increment" | "set"
                    metadata: Optional[Dict] - Event metadata

            Returns:
                {
                    usage_record_id: str,
                    quantity: int,
                    timestamp: str
                }
            """
            subscription_item = params["subscription_item"]
            quantity = params["quantity"]
            action = params.get("action", "increment")
            metadata = params.get("metadata", {})

            try:
                usage_record = stripe.SubscriptionItem.create_usage_record(
                    subscription_item,
                    quantity=quantity,
                    action=action,
                    timestamp=int(datetime.utcnow().timestamp())
                )

                return {
                    "usage_record_id": usage_record.id,
                    "quantity": usage_record.quantity,
                    "timestamp": datetime.fromtimestamp(usage_record.timestamp).isoformat()
                }
            except stripe.error.StripeError as e:
                return {"error": str(e)}

        @self.server.tool()
        async def process_refund(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Process credit refund

            Args:
                params:
                    user_id: str - User ID
                    amount: int - Credit amount to refund
                    reason: str - Refund reason
                    metadata: Optional[Dict] - Additional context

            Returns:
                {
                    refund_id: str,
                    amount: int,
                    status: str
                }
            """
            # Note: This creates a refund record, actual credit logic in backend
            metadata = params.get("metadata", {})
            metadata["user_id"] = params["user_id"]
            metadata["refund_reason"] = params["reason"]

            try:
                # In practice, you'd fetch the payment intent or charge ID
                # This is a simplified example
                return {
                    "refund_id": f"refund_{params['user_id']}_{int(datetime.utcnow().timestamp())}",
                    "amount": params["amount"],
                    "status": "succeeded",
                    "reason": params["reason"]
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def get_customer_balance(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Get customer credit balance

            Args:
                params:
                    user_id: str - User ID (maps to Stripe customer)
                    credit_type: str - "auto_apply" | "all"

            Returns:
                {
                    remaining: int,
                    used: int,
                    total: int
                }
            """
            # This would query your database for credit balance
            # Simplified implementation
            user_id = params["user_id"]
            credit_type = params.get("credit_type", "all")

            try:
                # In production, query database for credit balance
                # This is a placeholder
                return {
                    "remaining": 0,
                    "used": 0,
                    "total": 0,
                    "user_id": user_id,
                    "credit_type": credit_type
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def validate_webhook(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Validate Stripe webhook signature

            Args:
                params:
                    payload: str - Request body
                    signature: str - Stripe-Signature header

            Returns:
                {
                    valid: bool,
                    event_type: Optional[str],
                    event_id: Optional[str]
                }
            """
            payload = params["payload"]
            sig_header = params["signature"]

            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, self.webhook_secret
                )

                return {
                    "valid": True,
                    "event_type": event["type"],
                    "event_id": event["id"]
                }
            except ValueError:
                return {"valid": False, "error": "Invalid payload"}
            except stripe.error.SignatureVerificationError:
                return {"valid": False, "error": "Invalid signature"}

        @self.server.tool()
        async def list_invoices(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            List customer invoices

            Args:
                params:
                    customer_id: str - Stripe customer ID
                    limit: int - Number of invoices (default: 10)

            Returns:
                {
                    invoices: List[Dict]
                }
            """
            customer_id = params["customer_id"]
            limit = params.get("limit", 10)

            try:
                invoices = stripe.Invoice.list(customer=customer_id, limit=limit)

                invoice_list = []
                for inv in invoices.data:
                    invoice_list.append({
                        "invoice_id": inv.id,
                        "amount_due": inv.amount_due,
                        "status": inv.status,
                        "created": datetime.fromtimestamp(inv.created).isoformat(),
                        "period_start": datetime.fromtimestamp(inv.period_start).isoformat(),
                        "period_end": datetime.fromtimestamp(inv.period_end).isoformat()
                    })

                return {"invoices": invoice_list}
            except stripe.error.StripeError as e:
                return {"error": str(e)}

    async def run(self):
        """Run the MCP server"""
        await self.server.run()

if __name__ == "__main__":
    server = StripeMCPServer()
    asyncio.run(server.run())

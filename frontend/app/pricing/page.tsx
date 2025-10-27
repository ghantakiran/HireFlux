import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Start free and upgrade as you grow your career
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="text-3xl font-bold">$0<span className="text-lg font-normal">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>AI resume preview</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>3 cover letters per month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>10 job suggestions per month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Basic job matching</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline">
              Get Started Free
            </Button>
          </CardFooter>
        </Card>

        {/* Plus Plan */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Plus</CardTitle>
            <CardDescription>Most popular for job seekers</CardDescription>
            <div className="text-3xl font-bold">$19<span className="text-lg font-normal">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Unlimited resumes & cover letters</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>100 job suggestions per week</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Interview coach</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Job insights dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Apply Assist</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Subscribe to Plus
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Pro Plan - Coming Soon */}
      <div className="mt-16 text-center">
        <Card className="max-w-md mx-auto opacity-60">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>Coming soon</CardDescription>
            <div className="text-3xl font-bold">$49<span className="text-lg font-normal">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Everything in Plus</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>50 auto-apply credits/month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Advanced analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
            <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What happens to my data if I cancel?</h3>
            <p className="text-muted-foreground">Your data remains accessible for 30 days after cancellation. You can export your data anytime.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
            <p className="text-muted-foreground">We offer a 7-day free trial for Plus plans. Refunds are handled case-by-case.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

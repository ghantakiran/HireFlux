import type { Metadata } from 'next';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Scale, Shield, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'HireFlux terms of service. Review the terms and conditions for using our AI-powered recruiting platform.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: October 22, 2025
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              By accessing and using HireFlux, you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle>Service Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              HireFlux is an AI-powered job application platform that helps users:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Generate personalized resumes and cover letters using artificial intelligence</li>
              <li>Find and match with relevant job opportunities</li>
              <li>Streamline job applications through automated assistance</li>
              <li>Track application progress and receive job recommendations</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Account Creation</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the security of your account credentials</li>
                <li>You must be at least 18 years old to use our service</li>
                <li>One person may not maintain multiple accounts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Account Responsibilities</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Ensure your contact information remains current</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Use the service only for lawful purposes</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader>
            <CardTitle>Acceptable Use Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-green-600">Permitted Uses</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Creating resumes and cover letters for legitimate job applications</li>
                  <li>Searching for employment opportunities</li>
                  <li>Managing your job application pipeline</li>
                  <li>Using AI-generated content for personal job search purposes</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-red-600">Prohibited Uses</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Creating false or misleading information</li>
                  <li>Violating any applicable laws or regulations</li>
                  <li>Attempting to gain unauthorized access to our systems</li>
                  <li>Using the service to spam or harass others</li>
                  <li>Reverse engineering or attempting to extract our AI models</li>
                  <li>Reselling or redistributing our service without permission</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI-Generated Content */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">Content Ownership</h4>
                  <p className="text-blue-700 text-sm">
                    You retain ownership of the content you create using our AI tools. However, you are responsible 
                    for reviewing and ensuring the accuracy of all AI-generated content before use.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">Accuracy Disclaimer</h4>
                  <p className="text-yellow-700 text-sm">
                    AI-generated content may contain errors or inaccuracies. Always review and verify information 
                    before submitting applications or sharing with potential employers.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Subscription Plans</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Subscriptions are billed monthly or annually in advance</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>Prices may change with 30 days notice</li>
                <li>You can cancel your subscription at any time</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Credits</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Credits are purchased separately and expire after 12 months</li>
                <li>Credits are non-refundable and non-transferable</li>
                <li>Refunds may be issued for technical errors or invalid applications</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your privacy is important to us. Our collection and use of personal information is governed by our 
              Privacy Policy, which is incorporated into these Terms by reference.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                View Privacy Policy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Disclaimer</h4>
                  <p className="text-gray-700 text-sm">
                    HireFlux is provided "as is" without warranties of any kind. We do not guarantee job placement 
                    or interview opportunities. We are not responsible for the actions of employers or the outcome 
                    of job applications.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You may terminate your account at any time</li>
              <li>We may suspend or terminate your account for violations of these Terms</li>
              <li>Upon termination, your right to use the service ceases immediately</li>
              <li>We may retain certain information as required by law or for legitimate business purposes</li>
            </ul>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify users of material changes 
              via email or through the platform. Continued use of the service after changes constitutes acceptance 
              of the new Terms.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> legal@hireflux.com</p>
              <p><strong>Address:</strong> HireFlux Inc., 123 Tech Street, San Francisco, CA 94105</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Settings, User, Bell, CreditCard, Shield, Download, Trash2 } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and subscription
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Preferences
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue="+1 (555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" defaultValue="San Francisco, CA" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Job Search Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Job Search Preferences</CardTitle>
              <CardDescription>Configure your job search criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="targetTitles">Target Job Titles</Label>
                <Input 
                  id="targetTitles" 
                  placeholder="Software Engineer, Backend Developer, Senior Engineer"
                  defaultValue="Senior Software Engineer, Backend Developer"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryMin">Minimum Salary</Label>
                  <Input id="salaryMin" type="number" defaultValue="120000" />
                </div>
                <div>
                  <Label htmlFor="salaryMax">Maximum Salary</Label>
                  <Input id="salaryMax" type="number" defaultValue="180000" />
                </div>
              </div>
              <div>
                <Label htmlFor="remotePolicy">Remote Policy</Label>
                <Select defaultValue="hybrid">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="visaSponsorship" />
                <Label htmlFor="visaSponsorship">Require visa sponsorship</Label>
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Current Plan</h4>
                  <p className="text-muted-foreground">Plus Plan - $19/month</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Plan Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unlimited resumes & cover letters</li>
                  <li>• 100 job suggestions per week</li>
                  <li>• Interview coach</li>
                  <li>• Job insights dashboard</li>
                  <li>• Apply Assist</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Upgrade to Pro</Button>
                <Button variant="outline">Cancel Subscription</Button>
              </div>
            </CardContent>
          </Card>

          {/* Credits */}
          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
              <CardDescription>Manage your auto-apply credits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Current Balance</h4>
                  <p className="text-2xl font-bold text-blue-600">45 credits</p>
                </div>
                <Button>Purchase Credits</Button>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Recent Transactions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Auto-apply to TechCorp</span>
                    <span className="text-red-600">-1 credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit purchase</span>
                    <span className="text-green-600">+100 credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refund - Job unavailable</span>
                    <span className="text-green-600">+1 credit</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Apply Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Apply Settings</CardTitle>
              <CardDescription>Configure automated job applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="autoApplyEnabled" />
                <Label htmlFor="autoApplyEnabled">Enable auto-apply</Label>
              </div>
              <div>
                <Label htmlFor="minFitIndex">Minimum Fit Index</Label>
                <Select defaultValue="70">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="70">70</SelectItem>
                    <SelectItem value="80">80</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dailyLimit">Daily Application Limit</Label>
                <Select defaultValue="5">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="defaultResume">Default Resume Version</Label>
                <Select defaultValue="tech">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Tech Companies v2</SelectItem>
                    <SelectItem value="startup">Startup Focus</SelectItem>
                    <SelectItem value="general">General Purpose</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="autoGenerateCoverLetter" />
                <Label htmlFor="autoGenerateCoverLetter">Auto-generate cover letters</Label>
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>

          {/* Privacy & Data */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
              <CardDescription>Manage your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="emailNotifications" defaultChecked />
                <Label htmlFor="emailNotifications">Email notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="marketingEmails" />
                <Label htmlFor="marketingEmails">Marketing emails</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="dataAnalytics" defaultChecked />
                <Label htmlFor="dataAnalytics">Help improve our service (anonymous data)</Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

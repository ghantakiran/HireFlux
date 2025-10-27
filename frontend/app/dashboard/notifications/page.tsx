import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, AlertCircle, CreditCard, FileText, Building } from "lucide-react"

export default function NotificationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated on your job search progress
        </p>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <div className="text-sm text-muted-foreground">Unread</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">45</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">8</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </CardContent>
        </Card>
      </div>

      {/* Mark All Read */}
      <div className="mb-6 flex justify-end">
        <Button variant="outline">Mark All as Read</Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {/* Unread Notification */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">10 new high-fit jobs!</h4>
                  <Badge variant="secondary" className="text-xs">New</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  We found 10 jobs matching your profile with Fit Index > 80
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>2 hours ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    View Jobs
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Update */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Application submitted successfully</h4>
                  <Badge variant="outline" className="text-xs">Applied</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your application to <strong>Senior Software Engineer</strong> at <strong>TechCorp</strong> has been submitted
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>1 day ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    View Application
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Scheduled */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Interview scheduled</h4>
                  <Badge variant="secondary" className="text-xs">Interview</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Phone screen scheduled for <strong>Backend Developer</strong> at <strong>StartupCo</strong> on Friday at 2 PM
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>2 days ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Update */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CreditCard className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Credit refunded</h4>
                  <Badge variant="outline" className="text-xs">Credit</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  +1 credit refunded for <strong>Full Stack Engineer</strong> at <strong>BigCorp</strong> - Job no longer available
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>3 days ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    View Credits
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Letter Generated */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Cover letter generated</h4>
                  <Badge variant="outline" className="text-xs">Generated</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Cover letter for <strong>Product Manager</strong> at <strong>ScaleUp</strong> is ready for review
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>4 days ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    View Letter
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Building className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Weekly job matches report</h4>
                  <Badge variant="outline" className="text-xs">Report</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your weekly digest: 15 new jobs, 3 applications submitted, 1 interview scheduled
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>1 week ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    View Report
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Update */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Bell className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">New feature: Auto-Apply</h4>
                  <Badge variant="outline" className="text-xs">System</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Automatically apply to high-fit jobs with your pre-approved settings. Available for Pro subscribers.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>2 weeks ago</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Job Matches</h4>
                <p className="text-sm text-muted-foreground">Get notified when new high-fit jobs are found</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Application Updates</h4>
                <p className="text-sm text-muted-foreground">Notifications about your job applications</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Credit Updates</h4>
                <p className="text-sm text-muted-foreground">Credit purchases, refunds, and low balance alerts</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">System Updates</h4>
                <p className="text-sm text-muted-foreground">New features, maintenance, and important announcements</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

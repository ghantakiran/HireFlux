import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Building, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function ApplicationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Applications</h1>
        <p className="text-muted-foreground">
          Track your job applications and manage your pipeline
        </p>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">15</div>
            <div className="text-sm text-muted-foreground">Saved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">45</div>
            <div className="text-sm text-muted-foreground">Applied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">8</div>
            <div className="text-sm text-muted-foreground">Interview</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">2</div>
            <div className="text-sm text-muted-foreground">Offers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">10</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offers</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Applied</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="fit">Fit Index</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <div className="space-y-4">
        {/* Sample Application */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Senior Software Engineer</CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  TechCorp Inc.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Fit Index: 85
                </Badge>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Applied
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Applied 3 days ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Resume: Tech Companies v2</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>No response yet</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Application Method:</h4>
              <Badge variant="outline">Apply Assist</Badge>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Notes:</h4>
              <p className="text-sm text-muted-foreground">
                Applied through Greenhouse. Used tailored resume for tech companies. 
                Cover letter highlighted Python and FastAPI experience.
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button variant="outline">View Job</Button>
              <Button variant="outline">Update Status</Button>
              <Button variant="outline">Add Note</Button>
            </div>
          </CardContent>
        </Card>

        {/* Another Application */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Backend Developer</CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  StartupCo
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Fit Index: 72
                </Badge>
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Interview
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Applied 1 week ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Resume: Startup Focus</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Phone screen scheduled</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Application Method:</h4>
              <Badge variant="outline">Manual</Badge>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Next Steps:</h4>
              <p className="text-sm text-muted-foreground">
                Phone screen scheduled for Friday at 2 PM. 
                Prepare to discuss Python backend architecture and scaling challenges.
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button variant="outline">View Job</Button>
              <Button variant="outline">Update Status</Button>
              <Button variant="outline">Add Note</Button>
            </div>
          </CardContent>
        </Card>

        {/* Rejected Application */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Full Stack Engineer</CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  BigCorp
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Fit Index: 65
                </Badge>
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Applied 2 weeks ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Resume: General Purpose</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Rejected 1 week ago</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Application Method:</h4>
              <Badge variant="outline">Auto-Apply</Badge>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Feedback:</h4>
              <p className="text-sm text-muted-foreground">
                Position filled internally. Consider applying to similar roles 
                at this company in the future.
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button variant="outline">View Job</Button>
              <Button variant="outline">Archive</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Application Analytics</CardTitle>
          <CardDescription>Your job search performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Conversion Rates</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Applied → Interview</span>
                  <span className="font-medium">17.8%</span>
                </div>
                <div className="flex justify-between">
                  <span>Interview → Offer</span>
                  <span className="font-medium">25%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Response Time</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Average Response</span>
                  <span className="font-medium">7 days</span>
                </div>
                <div className="flex justify-between">
                  <span>Fastest Response</span>
                  <span className="font-medium">1 day</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Top Skills</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Python</span>
                  <span className="font-medium">85% match</span>
                </div>
                <div className="flex justify-between">
                  <span>FastAPI</span>
                  <span className="font-medium">78% match</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

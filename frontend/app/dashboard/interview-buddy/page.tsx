import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Mic, MicOff, RotateCcw, Star, Clock, CheckCircle } from "lucide-react"

export default function InterviewBuddyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Interview Buddy</h1>
          <Badge variant="secondary" className="ml-auto">
            <Star className="h-3 w-3 mr-1" />
            4.7 • 387 Ratings
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Get real-time interview help and answers to interview questions.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Interview Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Settings</CardTitle>
              <CardDescription>Configure your interview practice session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Interview Type</Label>
                <Select defaultValue="technical">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Interview</SelectItem>
                    <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                    <SelectItem value="system-design">System Design</SelectItem>
                    <SelectItem value="product">Product Management</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Role Level</Label>
                <Select defaultValue="senior">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid-Level (3-5 years)</SelectItem>
                    <SelectItem value="senior">Senior (6+ years)</SelectItem>
                    <SelectItem value="staff">Staff/Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Company Type</Label>
                <Select defaultValue="tech">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faang">FAANG</SelectItem>
                    <SelectItem value="tech">Tech Startup</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Focus Areas</Label>
                <Select defaultValue="python">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python & Backend</SelectItem>
                    <SelectItem value="frontend">Frontend Development</SelectItem>
                    <SelectItem value="fullstack">Full Stack</SelectItem>
                    <SelectItem value="devops">DevOps & Cloud</SelectItem>
                    <SelectItem value="data">Data Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Stats</CardTitle>
              <CardDescription>Your interview practice performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sessions Completed</span>
                  <span className="font-semibold">23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Score</span>
                  <span className="font-semibold text-green-600">8.2/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Questions Answered</span>
                  <span className="font-semibold">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Improvement Rate</span>
                  <span className="font-semibold text-blue-600">+15%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full">
                <Mic className="h-4 w-4 mr-2" />
                Start Voice Practice
              </Button>
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Mock Interview
              </Button>
              <Button variant="outline" className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Review Past Sessions
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Interview Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Interview Practice</CardTitle>
                  <CardDescription>Practice with AI-powered interview questions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                  <Button variant="outline" size="sm">
                    <MicOff className="h-4 w-4 mr-2" />
                    Voice Off
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Current Question */}
              <div className="mb-6">
                <div className="p-4 bg-muted rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">Question 1 of 5</h3>
                  <p className="text-sm font-medium mb-2">
                    Our enterprise sales cycle is 120 days; how would you shorten it?
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>2 minutes remaining</span>
                  </div>
                </div>

                {/* Answer Input */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Your Answer</Label>
                    <Textarea 
                      placeholder="Type your answer here or use voice input..."
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button>
                      <Mic className="h-4 w-4 mr-2" />
                      Voice Input
                    </Button>
                    <Button variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Answer
                    </Button>
                    <Button variant="outline">
                      Answer ⌘A
                    </Button>
                  </div>
                </div>
              </div>

              {/* AI Feedback */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">AI Feedback</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Map each account to a buying-committee heat-map, surface user-specific ROI dashboards 
                  in week 1, and secure a technical pilot inside 30 days.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-700">Strong quantitative approach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-700">Good use of specific metrics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs text-yellow-700">Consider mentioning stakeholder alignment</span>
                  </div>
                </div>
              </div>

              {/* Sample Answer */}
              <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-semibold mb-2">Sample Answer</h4>
                <p className="text-sm text-muted-foreground">
                  "I'd approach this by first analyzing our current sales funnel to identify bottlenecks. 
                  Then I'd implement a three-pronged strategy: 1) Early stakeholder mapping and engagement, 
                  2) Customized ROI demonstrations within the first 30 days, and 3) Streamlined technical 
                  pilot programs. This approach reduced our cycle at InnovateX from 120 to 75 days."
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interview History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your interview practice history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-semibold">Technical Interview - Python</h4>
                    <p className="text-sm text-muted-foreground">Google • Senior Engineer • 2 hours ago</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500 text-white">8.5/10</Badge>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-semibold">System Design Interview</h4>
                    <p className="text-sm text-muted-foreground">Meta • Staff Engineer • Yesterday</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-500 text-white">7.8/10</Badge>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-semibold">Behavioral Interview</h4>
                    <p className="text-sm text-muted-foreground">Stripe • Senior Engineer • 2 days ago</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500 text-white">9.1/10</Badge>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

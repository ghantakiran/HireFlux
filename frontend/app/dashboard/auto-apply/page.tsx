import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, TrendingUp, Clock, CheckCircle, AlertCircle, Pause, Play } from "lucide-react"

export default function AutoApplyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Auto Apply To Jobs</h1>
          <Badge variant="secondary" className="ml-auto bg-green-500 text-white">
            <TrendingUp className="h-3 w-3 mr-1" />
            Live Updates
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Let AI apply to thousands of jobs for you automatically. Save time and get hired faster.
        </p>
      </div>

      {/* Auto-Apply Status */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">587</div>
            <div className="text-sm text-muted-foreground">Jobs Applied</div>
            <div className="text-xs text-green-600 mt-1">+23 today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">45</div>
            <div className="text-sm text-muted-foreground">Responses</div>
            <div className="text-xs text-green-600 mt-1">7.7% rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">12</div>
            <div className="text-sm text-muted-foreground">Interviews</div>
            <div className="text-xs text-green-600 mt-1">2.0% rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">3</div>
            <div className="text-sm text-muted-foreground">Offers</div>
            <div className="text-xs text-green-600 mt-1">0.5% rate</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Auto-Apply Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Apply Settings</CardTitle>
              <CardDescription>Configure your automated job applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Auto-Apply</Label>
                  <p className="text-xs text-muted-foreground">Automatically apply to matching jobs</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Minimum Fit Index</Label>
                <Select defaultValue="80">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="85">85%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Daily Application Limit</Label>
                <Select defaultValue="10">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 applications</SelectItem>
                    <SelectItem value="10">10 applications</SelectItem>
                    <SelectItem value="15">15 applications</SelectItem>
                    <SelectItem value="20">20 applications</SelectItem>
                    <SelectItem value="50">50 applications</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Resume Version</Label>
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

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-Generate Cover Letters</Label>
                  <p className="text-xs text-muted-foreground">Create personalized cover letters</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit Balance</CardTitle>
              <CardDescription>Manage your auto-apply credits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">45</div>
                <div className="text-sm text-muted-foreground mb-4">Credits Remaining</div>
                <div className="space-y-2">
                  <Button className="w-full">Purchase Credits</Button>
                  <Button variant="outline" className="w-full">View Usage</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-Apply Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    <Play className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Run</span>
                  <span className="text-sm text-muted-foreground">2 minutes ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Next Run</span>
                  <span className="text-sm text-muted-foreground">In 58 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Jobs Found Today</span>
                  <span className="text-sm text-muted-foreground">23</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Application Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Application Feed</CardTitle>
                  <CardDescription>Real-time job applications and responses</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Recent Applications */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>
                    <div>
                      <p className="font-medium">Principal Engineer</p>
                      <p className="text-sm text-muted-foreground">Amazon • Cloud Services</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-500 text-black">AWS</Badge>
                    <Badge variant="outline" className="bg-blue-500 text-white">DevOps</Badge>
                    <Badge variant="secondary" className="bg-green-500 text-white">Applying...</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">S</div>
                    <div>
                      <p className="font-medium">Data Analyst</p>
                      <p className="text-sm text-muted-foreground">Stripe • Finance</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500 text-white">Analytics</Badge>
                    <Badge variant="outline" className="bg-blue-500 text-white">Python</Badge>
                    <Badge variant="secondary" className="bg-green-500 text-white">Applied</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">M</div>
                    <div>
                      <p className="font-medium">Strategy Partner</p>
                      <p className="text-sm text-muted-foreground">Microsoft • Corporate</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500 text-white">Strategy</Badge>
                    <Badge variant="outline" className="bg-purple-500 text-white">Leadership</Badge>
                    <Badge variant="secondary" className="bg-yellow-500 text-black">Pending</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">M</div>
                    <div>
                      <p className="font-medium">Product Manager</p>
                      <p className="text-sm text-muted-foreground">Meta • Technology</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500 text-white">Product</Badge>
                    <Badge variant="outline" className="bg-purple-500 text-white">AI/ML</Badge>
                    <Badge variant="secondary" className="bg-green-500 text-white">Applied</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">G</div>
                    <div>
                      <p className="font-medium">Software Engineer</p>
                      <p className="text-sm text-muted-foreground">Google • Engineering</p>
                      <p className="text-xs text-muted-foreground">6 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500 text-white">React</Badge>
                    <Badge variant="outline" className="bg-green-500 text-white">Node.js</Badge>
                    <Badge variant="secondary" className="bg-green-500 text-white">Applied</Badge>
                  </div>
                </div>

                {/* Response Notification */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">New Response!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Stripe wants to schedule a phone screen for the Data Analyst position.
                  </p>
                  <Button size="sm" className="mt-2">
                    Schedule Interview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Analytics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Your auto-apply performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Response Rate by Company</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Stripe</span>
                      <div className="flex items-center gap-2">
                        <Progress value={12} className="w-20" />
                        <span className="text-sm">12%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Google</span>
                      <div className="flex items-center gap-2">
                        <Progress value={8} className="w-20" />
                        <span className="text-sm">8%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Meta</span>
                      <div className="flex items-center gap-2">
                        <Progress value={6} className="w-20" />
                        <span className="text-sm">6%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Daily Applications</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Today</span>
                      <span className="text-sm font-medium">23</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Yesterday</span>
                      <span className="text-sm font-medium">18</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Week</span>
                      <span className="text-sm font-medium">156</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Month</span>
                      <span className="text-sm font-medium">587</span>
                    </div>
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

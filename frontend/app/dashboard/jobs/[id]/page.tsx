import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, MapPin, Clock, DollarSign, Users, Briefcase, ExternalLink } from "lucide-react"

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => window.history.back()}>
          ← Back to Jobs
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Senior Software Engineer</CardTitle>
                  <CardDescription className="text-lg flex items-center gap-2 mt-2">
                    <Building className="h-5 w-5" />
                    TechCorp Inc.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Fit Index: 85
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Posted 2 days ago</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>$150k - $200k</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Hybrid</Badge>
                  <Badge variant="outline">Full-time</Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg">Apply Now</Button>
                <Button variant="outline" size="lg">Save Job</Button>
                <Button variant="outline" size="lg">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h3>About the Role</h3>
                <p>
                  We are looking for a Senior Software Engineer to join our backend team. 
                  You'll work with Python, FastAPI, and PostgreSQL to build scalable systems 
                  that serve millions of users worldwide.
                </p>

                <h3>What You'll Do</h3>
                <ul>
                  <li>Design and implement high-performance backend services</li>
                  <li>Collaborate with cross-functional teams to deliver features</li>
                  <li>Mentor junior developers and conduct code reviews</li>
                  <li>Optimize database queries and system performance</li>
                  <li>Participate in architecture decisions and technical planning</li>
                </ul>

                <h3>Requirements</h3>
                <ul>
                  <li>5+ years of software engineering experience</li>
                  <li>Strong proficiency in Python and FastAPI</li>
                  <li>Experience with PostgreSQL and database optimization</li>
                  <li>Knowledge of microservices architecture</li>
                  <li>Experience with cloud platforms (AWS, GCP, or Azure)</li>
                  <li>Strong problem-solving and communication skills</li>
                </ul>

                <h3>Nice to Have</h3>
                <ul>
                  <li>Experience with Kubernetes and Docker</li>
                  <li>Knowledge of Redis and caching strategies</li>
                  <li>Experience with CI/CD pipelines</li>
                  <li>Previous startup experience</li>
                </ul>

                <h3>Benefits</h3>
                <ul>
                  <li>Competitive salary and equity</li>
                  <li>Comprehensive health, dental, and vision insurance</li>
                  <li>401(k) with company matching</li>
                  <li>Flexible work arrangements</li>
                  <li>Professional development budget</li>
                  <li>Unlimited PTO</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>About TechCorp Inc.</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Company Overview</h4>
                  <p className="text-muted-foreground">
                    TechCorp is a leading technology company focused on building innovative 
                    solutions for the modern workplace. Founded in 2015, we've grown to serve 
                    over 10 million users across 50+ countries.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Company Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>500+ employees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>Series C startup</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>San Francisco, CA</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Why This Matches</CardTitle>
              <CardDescription>AI analysis of your fit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Overall Fit</span>
                    <span className="text-sm font-bold">85/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Skills Match</span>
                    <span className="text-sm font-bold">90/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Experience Level</span>
                    <span className="text-sm font-bold">85/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Location Match</span>
                    <span className="text-sm font-bold">80/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong>Strong match</strong> based on Python, FastAPI skills and 5+ years experience. 
                  Target seniority aligns with Senior level. Hybrid work policy matches preferences.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Skills Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Matched Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">Python</Badge>
                    <Badge variant="secondary">FastAPI</Badge>
                    <Badge variant="secondary">PostgreSQL</Badge>
                    <Badge variant="secondary">Microservices</Badge>
                    <Badge variant="secondary">AWS</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Missing Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">Kubernetes</Badge>
                    <Badge variant="outline">Redis</Badge>
                    <Badge variant="outline">CI/CD</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Learning Opportunities</h4>
                  <p className="text-xs text-muted-foreground">
                    Consider learning Kubernetes and Redis to improve your fit for similar roles.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Application Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-1">✓ Highlight These</h4>
                  <p className="text-green-700">
                    Emphasize your Python and FastAPI experience, especially any performance optimization work.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-1">💡 Mention</h4>
                  <p className="text-blue-700">
                    Any experience with microservices architecture or mentoring junior developers.
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-1">⚠️ Address</h4>
                  <p className="text-yellow-700">
                    If you don't have Kubernetes experience, mention your willingness to learn.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Similar Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm">Backend Engineer</h4>
                  <p className="text-xs text-muted-foreground">StartupCo • Fit: 78</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm">Python Developer</h4>
                  <p className="text-xs text-muted-foreground">ScaleUp • Fit: 72</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm">Senior Backend Engineer</h4>
                  <p className="text-xs text-muted-foreground">BigTech • Fit: 70</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

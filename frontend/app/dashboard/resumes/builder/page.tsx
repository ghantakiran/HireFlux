import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { FileText, Target, Download, RefreshCw, CheckCircle, Zap } from "lucide-react"

export default function ResumeBuilderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6" />
          <h1 className="text-3xl font-bold">AI Resume Builder</h1>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Generate ATS-optimized resumes tailored to your target role in minutes
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Resume Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resume Details</CardTitle>
              <CardDescription>Provide your information for AI optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="San Francisco, CA" />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" placeholder="linkedin.com/in/johndoe" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Job</CardTitle>
              <CardDescription>Specify the role you're applying for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" placeholder="Senior Software Engineer" />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="TechCorp Inc." />
              </div>
              <div>
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea 
                  id="jobDescription" 
                  placeholder="Paste the job description here..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
              <CardDescription>Add your work experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentRole">Current Role</Label>
                <Input id="currentRole" placeholder="Software Engineer" />
              </div>
              <div>
                <Label htmlFor="currentCompany">Current Company</Label>
                <Input id="currentCompany" placeholder="Current Corp" />
              </div>
              <div>
                <Label htmlFor="experience">Experience Description</Label>
                <Textarea 
                  id="experience" 
                  placeholder="Describe your key achievements and responsibilities..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>List your technical skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Textarea 
                  id="skills" 
                  placeholder="Python, React, AWS, Docker, Kubernetes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Resume
          </Button>
        </div>

        {/* Resume Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resume Preview</CardTitle>
                  <CardDescription>AI-optimized resume for your target role</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500 text-white">
                    <Target className="h-3 w-3 mr-1" />
                    99.8% Match
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Resume Preview */}
              <div className="bg-white border rounded-lg p-6 shadow-sm">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">John Doe</h1>
                  <div className="text-sm text-muted-foreground mt-2">
                    San Francisco, CA • john@example.com • +1 (555) 123-4567
                  </div>
                  <div className="text-sm text-muted-foreground">
                    linkedin.com/in/johndoe
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h2 className="text-lg font-semibold border-b pb-1 mb-3">Summary</h2>
                    <p className="text-sm text-muted-foreground">
                      Experienced Software Engineer with 5+ years of expertise in Python, React, and cloud technologies. 
                      Proven track record of building scalable applications and leading cross-functional teams. 
                      Passionate about creating innovative solutions that drive business growth and user satisfaction.
                    </p>
                  </div>

                  {/* Experience */}
                  <div>
                    <h2 className="text-lg font-semibold border-b pb-1 mb-3">Experience</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">Senior Software Engineer</h3>
                            <p className="text-sm text-muted-foreground">Current Corp • 2022 - Present</p>
                          </div>
                        </div>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Led development of microservices architecture serving 1M+ users</li>
                          <li>• Implemented CI/CD pipelines reducing deployment time by 60%</li>
                          <li>• Mentored 3 junior developers and conducted code reviews</li>
                          <li>• Optimized database queries improving response time by 40%</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h2 className="text-lg font-semibold border-b pb-1 mb-3">Technical Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Python</Badge>
                      <Badge variant="secondary">React</Badge>
                      <Badge variant="secondary">AWS</Badge>
                      <Badge variant="secondary">Docker</Badge>
                      <Badge variant="secondary">Kubernetes</Badge>
                      <Badge variant="secondary">PostgreSQL</Badge>
                      <Badge variant="secondary">FastAPI</Badge>
                      <Badge variant="secondary">TypeScript</Badge>
                    </div>
                  </div>

                  {/* Education */}
                  <div>
                    <h2 className="text-lg font-semibold border-b pb-1 mb-3">Education</h2>
                    <div>
                      <h3 className="font-semibold">Bachelor of Science in Computer Science</h3>
                      <p className="text-sm text-muted-foreground">University of California • 2018</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Analysis */}
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800">Perfect Match!</span>
                </div>
                <p className="text-sm text-green-700">
                  Your resume is optimized for this Senior Software Engineer role. 
                  All key skills and experience align perfectly with the job requirements.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resume Versions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Resume Versions</CardTitle>
              <CardDescription>Different versions for different roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-semibold">Tech Companies Version</h4>
                    <p className="text-sm text-muted-foreground">Optimized for FAANG companies</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">98.5% match</Badge>
                    <Button variant="outline" size="sm">Use</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-semibold">Startup Focus</h4>
                    <p className="text-sm text-muted-foreground">Emphasizes agility and growth</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">95.2% match</Badge>
                    <Button variant="outline" size="sm">Use</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-semibold">Enterprise Edition</h4>
                    <p className="text-sm text-muted-foreground">Corporate-focused format</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">92.8% match</Badge>
                    <Button variant="outline" size="sm">Use</Button>
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

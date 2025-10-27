import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, FileText, Building, Calendar, Edit, Trash2 } from "lucide-react"

export default function CoverLettersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">Cover Letters</h1>
          <p className="text-muted-foreground">
            Manage your AI-generated cover letters
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generate New
        </Button>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <div className="text-sm text-muted-foreground">Total Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">8</div>
            <div className="text-sm text-muted-foreground">Used in Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">3</div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="techcorp">TechCorp</SelectItem>
                <SelectItem value="startupco">StartupCo</SelectItem>
                <SelectItem value="bigcorp">BigCorp</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="tone">Tone</SelectItem>
                <SelectItem value="length">Length</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cover Letters List */}
      <div className="space-y-4">
        {/* Sample Cover Letter */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Senior Software Engineer Application
                </CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  TechCorp Inc.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Professional</Badge>
                <Badge variant="secondary">Medium</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created 3 days ago</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">280 words</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Used in application</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Preview:</h4>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  Dear Hiring Manager,<br/><br/>
                  I am writing to express my strong interest in the Senior Software Engineer position at TechCorp Inc. 
                  With over 5 years of experience in Python and FastAPI development, I am excited about the opportunity 
                  to contribute to your backend infrastructure...<br/><br/>
                  In my previous role at XYZ Corp, I led the development of a microservices architecture that reduced 
                  system latency by 40% and improved scalability for our growing user base...
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Generation Details:</h4>
              <div className="text-sm text-muted-foreground">
                <p>• Generated in 3.2 seconds using GPT-4 Turbo</p>
                <p>• Based on resume version: "Tech Companies v2"</p>
                <p>• Company personalized: Yes</p>
                <p>• Cost: $0.12</p>
              </div>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button variant="outline">View Full Letter</Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline">Export PDF</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Another Cover Letter */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Backend Developer Application
                </CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  StartupCo
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Conversational</Badge>
                <Badge variant="secondary">Short</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created 1 week ago</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">180 words</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Used in application</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Preview:</h4>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  Hi there!<br/><br/>
                  I'm excited to apply for the Backend Developer position at StartupCo. 
                  Your mission to revolutionize the industry really resonates with me, 
                  and I'd love to be part of building something amazing...<br/><br/>
                  My experience with Python and Django, combined with my passion for 
                  scalable systems, makes me a great fit for your team...
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Generation Details:</h4>
              <div className="text-sm text-muted-foreground">
                <p>• Generated in 2.8 seconds using GPT-4 Turbo</p>
                <p>• Based on resume version: "Startup Focus"</p>
                <p>• Company personalized: Yes</p>
                <p>• Cost: $0.08</p>
              </div>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button variant="outline">View Full Letter</Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline">Export PDF</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Draft Cover Letter */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Full Stack Engineer Application
                </CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  BigCorp
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Concise</Badge>
                <Badge variant="secondary">Long</Badge>
                <Badge variant="destructive">Draft</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created 2 weeks ago</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">320 words</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Not used yet</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Preview:</h4>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  Dear Hiring Team,<br/><br/>
                  I am writing to apply for the Full Stack Engineer position at BigCorp. 
                  With extensive experience in both frontend and backend development, 
                  I am confident I can contribute to your engineering team...<br/><br/>
                  My technical expertise spans React, Node.js, Python, and cloud technologies, 
                  making me well-suited for full-stack development challenges...
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Notes:</h4>
              <Textarea 
                placeholder="Add notes about this cover letter..."
                className="min-h-[80px]"
                defaultValue="Need to emphasize cloud experience more. Consider adding specific AWS projects."
              />
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button variant="outline">View Full Letter</Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline">Export PDF</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Form */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Generate New Cover Letter</CardTitle>
          <CardDescription>Create a personalized cover letter for your next application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Job Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Job Title</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 p-2 border rounded-md"
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Company</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 p-2 border rounded-md"
                    placeholder="e.g., TechCorp Inc."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Job Description</label>
                  <Textarea 
                    className="mt-1"
                    placeholder="Paste the job description here..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Generation Options</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Resume Version</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resume version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Tech Companies v2</SelectItem>
                      <SelectItem value="startup">Startup Focus</SelectItem>
                      <SelectItem value="general">General Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tone</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Length</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (150-200 words)</SelectItem>
                      <SelectItem value="medium">Medium (250-300 words)</SelectItem>
                      <SelectItem value="long">Long (350-400 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="personalize" />
                  <label htmlFor="personalize" className="text-sm">
                    Personalize for company
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>
              Generate Cover Letter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

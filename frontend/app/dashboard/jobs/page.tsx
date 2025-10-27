import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Clock, DollarSign, Filter } from "lucide-react"

export default function JobsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Job Matches</h1>
        <p className="text-muted-foreground">
          AI-powered job recommendations tailored to your profile
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs..." className="pl-10" />
            </div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Remote Policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Salary Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="50k-80k">$50k - $80k</SelectItem>
                <SelectItem value="80k-120k">$80k - $120k</SelectItem>
                <SelectItem value="120k-160k">$120k - $160k</SelectItem>
                <SelectItem value="160k+">$160k+</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Posted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="week">Last week</SelectItem>
                <SelectItem value="month">Last month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Job Cards */}
      <div className="space-y-4">
        {/* Sample Job Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Senior Software Engineer</CardTitle>
                <CardDescription className="text-lg">TechCorp Inc.</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Fit Index: 85
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
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
              <Badge variant="outline">Hybrid</Badge>
            </div>
            
            <p className="text-muted-foreground mb-4">
              We are looking for a Senior Software Engineer to join our backend team. 
              You'll work with Python, FastAPI, and PostgreSQL to build scalable systems...
            </p>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Why this matches:</h4>
              <p className="text-sm text-muted-foreground">
                Strong match based on Python, FastAPI skills and 5+ years experience. 
                Target seniority aligns with Senior level.
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <Badge variant="secondary">Python</Badge>
              <Badge variant="secondary">FastAPI</Badge>
              <Badge variant="secondary">PostgreSQL</Badge>
              <Badge variant="outline">Kubernetes</Badge>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button>Apply Now</Button>
              <Button variant="outline">Save Job</Button>
              <Button variant="outline">View Details</Button>
            </div>
          </CardContent>
        </Card>

        {/* More sample jobs */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Backend Developer</CardTitle>
                <CardDescription className="text-lg">StartupCo</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Fit Index: 72
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Remote</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Posted 1 week ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>$120k - $160k</span>
              </div>
              <Badge variant="outline">Remote</Badge>
            </div>
            
            <p className="text-muted-foreground mb-4">
              Join our fast-growing startup as a Backend Developer. 
              Work with modern technologies and have a big impact...
            </p>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Why this matches:</h4>
              <p className="text-sm text-muted-foreground">
                Good match for Python and backend development experience. 
                Remote work aligns with preferences.
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <Badge variant="secondary">Python</Badge>
              <Badge variant="secondary">Django</Badge>
              <Badge variant="secondary">AWS</Badge>
              <Badge variant="outline">React</Badge>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button>Apply Now</Button>
              <Button variant="outline">Save Job</Button>
              <Button variant="outline">View Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center">
        <div className="flex gap-2">
          <Button variant="outline" disabled>Previous</Button>
          <Button variant="outline">1</Button>
          <Button variant="outline">2</Button>
          <Button variant="outline">3</Button>
          <Button variant="outline">Next</Button>
        </div>
      </div>
    </div>
  )
}

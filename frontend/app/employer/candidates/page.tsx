'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { SearchInput } from '@/components/ui/search-input';
import { useSearch } from '@/hooks/useSearch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { candidateSearchApi } from '@/lib/api';
import { Search, MapPin, DollarSign, Briefcase, Eye, Save, Filter, X, Users } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { FilterBar } from '@/components/ui/filter-bar';
import { useColumnSort, parseSortValue } from '@/hooks/useColumnSort';
import { useURLState } from '@/hooks/useURLState';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/domain/EmptyState';
import { useRouter } from 'next/navigation';
import { titleCase } from '@/lib/utils';

interface CandidateProfile {
  id: string;
  headline: string;
  bio?: string;
  location?: string;
  skills: string[];
  years_experience?: number;
  experience_level?: string;
  min_salary?: number;
  max_salary?: number;
  preferred_location_type?: string;
  availability_status?: string;
  portfolio_items?: any[];
  updated_at: string;
}

interface SearchFilters {
  skills: string[];
  experience_level: string[];
  min_years_experience?: number;
  max_years_experience?: number;
  location?: string;
  remote_only: boolean;
  location_type?: string;
  min_salary?: number;
  max_salary?: number;
  availability_status: string[];
  preferred_roles: string[];
  page: number;
  limit: number;
}

import { SKILLS_OPTIONS, EXPERIENCE_LEVELS, LOCATION_TYPES, AVAILABILITY_STATUSES } from '@/lib/constants/filter-options';
import { PageLoader } from '@/components/ui/page-loader';

const CANDIDATE_URL_CONFIG = {
  sort: { defaultValue: 'updated_at' },
  sort_dir: { defaultValue: 'desc' },
  page: { defaultValue: '1' },
  location_type: { defaultValue: '' },
  experience_level: { defaultValue: '' },
};

export default function CandidateSearchPage() {
  const router = useRouter();
  const urlState = useURLState(CANDIDATE_URL_CONFIG);

  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)
  // Client-side fallback to ensure title is always set (resolves SSR/hydration timing issues)
  useEffect(() => {
    document.title = 'Candidate Search | HireFlux';
  }, []);

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    skills: [],
    experience_level: [],
    min_years_experience: undefined,
    max_years_experience: undefined,
    location: '',
    remote_only: false,
    location_type: undefined,
    min_salary: undefined,
    max_salary: undefined,
    availability_status: [],
    preferred_roles: [],
    page: 1,
    limit: 20,
  });

  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery } = useSearch();

  const searchFilteredCandidates = useMemo(() => {
    if (!debouncedQuery) return candidates;
    const q = debouncedQuery.toLowerCase();
    return candidates.filter((c) =>
      c.headline?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.skills?.some((s: string) => s.toLowerCase().includes(q))
    );
  }, [candidates, debouncedQuery]);

  // Sorting
  const { sortedItems: sortedCandidates, setSort } = useColumnSort<CandidateProfile>({
    items: searchFilteredCandidates,
    defaultSort: {
      column: (urlState.params.sort || 'updated_at') as any,
      direction: (urlState.params.sort_dir || 'desc') as 'asc' | 'desc',
    },
  });

  const sortDropdownValue = `${urlState.params.sort}_${urlState.params.sort_dir}`;

  const handleSortChange = (value: string) => {
    const { column, direction } = parseSortValue(value);
    setSort(column, direction);
    urlState.setParams({ sort: column, sort_dir: direction, page: '1' });
  };

  useEffect(() => {
    const col = urlState.params.sort || 'updated_at';
    const dir = urlState.params.sort_dir || 'desc';
    setSort(col, dir as 'asc' | 'desc');
  }, [urlState.params.sort, urlState.params.sort_dir]);

  const handleSearch = async () => {
    try {
      setLoading(true);

      const searchData: any = {
        page: filters.page,
        limit: filters.limit,
      };

      // Only include non-empty filters
      if (filters.skills.length > 0) searchData.skills = filters.skills;
      if (filters.experience_level.length > 0) searchData.experience_level = filters.experience_level;
      if (filters.min_years_experience) searchData.min_years_experience = filters.min_years_experience;
      if (filters.max_years_experience) searchData.max_years_experience = filters.max_years_experience;
      if (filters.location) searchData.location = filters.location;
      if (filters.remote_only) searchData.remote_only = filters.remote_only;
      if (filters.location_type) searchData.location_type = filters.location_type;
      if (filters.min_salary) searchData.min_salary = filters.min_salary;
      if (filters.max_salary) searchData.max_salary = filters.max_salary;
      if (filters.availability_status.length > 0) searchData.availability_status = filters.availability_status;
      if (filters.preferred_roles.length > 0) searchData.preferred_roles = filters.preferred_roles;

      const response = await candidateSearchApi.search(searchData);

      if (response.data.success) {
        setCandidates(response.data.data.candidates || []);
        setTotalResults(response.data.data.total || 0);
      }
    } catch (error: any) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const handleViewProfile = async (candidate: CandidateProfile) => {
    try {
      const response = await candidateSearchApi.getProfile(candidate.id);
      if (response.data.success) {
        setSelectedCandidate(response.data.data);
        setShowCandidateModal(true);
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
    setTimeout(handleSearch, 0);
  };

  const totalPages = Math.ceil(totalResults / filters.limit);

  const getActiveFiltersText = () => {
    const parts: string[] = [];

    if (filters.skills.length > 0) {
      parts.push(`Filtering by: ${filters.skills.join(', ')}`);
    }
    if (filters.experience_level.length > 0) {
      parts.push(`Experience: ${filters.experience_level.join(', ')}`);
    }
    if (filters.location) {
      parts.push(`Location: ${filters.location}`);
    }
    if (filters.remote_only) {
      parts.push('Remote only');
    }
    if (filters.availability_status.length > 0) {
      parts.push(`Status: ${filters.availability_status.map(s => s.replace('_', ' ')).join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No active filters';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Candidate Search</h1>
        <p className="text-muted-foreground">
          Discover talented candidates for your open positions
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden"
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Keyword Search */}
              <div className="mb-4">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search candidates..."
                />
              </div>

              {/* Skills Filter */}
              <div>
                <Label htmlFor="skills">Skills</Label>
                <TagInput
                  id="skills"
                  value={filters.skills}
                  onChange={(skills) => setFilters({ ...filters, skills })}
                  placeholder="Add skills..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Candidates must have ALL selected skills
                </p>
              </div>

              {/* Experience Level Filter */}
              <div>
                <Label>Experience Level</Label>
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`exp-${level}`}
                        checked={filters.experience_level.includes(level)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              experience_level: [...filters.experience_level, level],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              experience_level: filters.experience_level.filter(l => l !== level),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`exp-${level}`} className="font-normal">
                        {titleCase(level)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Years of Experience */}
              <div>
                <Label>Years of Experience</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.min_years_experience || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      min_years_experience: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.max_years_experience || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      max_years_experience: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  placeholder="City or region"
                />
              </div>

              {/* Remote Only */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remote_only"
                  checked={filters.remote_only}
                  onChange={(e) => setFilters({ ...filters, remote_only: e.target.checked })}
                />
                <Label htmlFor="remote_only">Remote only</Label>
              </div>

              {/* Location Type */}
              <div>
                <Label htmlFor="location_type">Location Type</Label>
                <Select
                  value={filters.location_type || ''}
                  onValueChange={(value) => setFilters({ ...filters, location_type: value || undefined })}
                >
                  <SelectTrigger id="location_type">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {LOCATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {titleCase(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Salary Range */}
              <div>
                <Label>Salary Range ($)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.min_salary || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      min_salary: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.max_salary || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      max_salary: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>

              {/* Availability Status */}
              <div>
                <Label>Availability</Label>
                <div className="space-y-2">
                  {AVAILABILITY_STATUSES.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`avail-${status}`}
                        checked={filters.availability_status.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              availability_status: [...filters.availability_status, status],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              availability_status: filters.availability_status.filter(s => s !== status),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`avail-${status}`} className="font-normal">
                        {titleCase(status)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <Button className="w-full" onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>

              {/* Save Search */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Search
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Active Filters Display */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-sm">
                <strong>{totalResults}</strong> candidates found
                {' • '}
                {getActiveFiltersText()}
              </p>
            </CardContent>
          </Card>

          {/* Sort & Results Per Page */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <FilterBar
              filters={[
                {
                  type: 'select',
                  key: 'sort',
                  label: 'Sort by',
                  options: [
                    { value: 'updated_at_desc', label: 'Recently Updated' },
                    { value: 'updated_at_asc', label: 'Oldest Updated' },
                    { value: 'years_experience_desc', label: 'Most Experience' },
                    { value: 'years_experience_asc', label: 'Least Experience' },
                  ],
                },
              ]}
              values={{ sort: sortDropdownValue }}
              onChange={(_key, val) => handleSortChange(val)}
              showClearButton={false}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="limit">Results per page:</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => {
                  setFilters({ ...filters, limit: parseInt(value), page: 1 });
                  setTimeout(handleSearch, 0);
                }}
              >
                <SelectTrigger id="limit" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {totalPages > 1 && (
              <p className="text-sm text-muted-foreground">
                Page {filters.page} of {totalPages}
              </p>
            )}
          </div>

          {/* Candidate Cards */}
          {loading ? (
            <PageLoader message="Searching candidates..." />
          ) : sortedCandidates.length > 0 ? (
            <div className="space-y-4">
              {sortedCandidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid="candidate-card"
                  variant="interactive"
                  onClick={() => handleViewProfile(candidate)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{candidate.headline}</h3>
                        {candidate.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {candidate.location}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {candidate.availability_status && (
                          <Badge
                            variant={candidate.availability_status === 'actively_looking' ? 'default' : 'secondary'}
                          >
                            {candidate.availability_status.split('_').join(' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {candidate.bio && (
                      <p className="text-sm mb-4 line-clamp-2">{candidate.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4" data-testid="candidate-skills">
                      {candidate.skills.slice(0, 5).map((skill) => (
                        <Badge key={skill} variant="outline">{skill}</Badge>
                      ))}
                      {candidate.skills.length > 5 && (
                        <Badge variant="outline">+{candidate.skills.length - 5} more</Badge>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-4">
                        {candidate.years_experience && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {candidate.years_experience} years
                          </span>
                        )}
                        {candidate.experience_level && (
                          <span>{candidate.experience_level}</span>
                        )}
                        {candidate.min_salary && candidate.max_salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${candidate.min_salary.toLocaleString()} - ${candidate.max_salary.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile(candidate);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No candidates found"
              description="Candidates will appear here once you've posted jobs and received applications."
              icon={<Users className="h-12 w-12 text-muted-foreground" />}
              actionLabel="Post a Job"
              onAction={() => router.push('/employer/jobs/new')}
            />
          )}

          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Candidate Profile Modal */}
      <Dialog open={showCandidateModal} onOpenChange={setShowCandidateModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCandidate.headline}</DialogTitle>
                <DialogDescription>
                  {selectedCandidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedCandidate.location}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Availability Badge */}
                {selectedCandidate.availability_status && (
                  <div>
                    <Badge
                      variant={selectedCandidate.availability_status === 'actively_looking' ? 'default' : 'secondary'}
                      className="text-sm"
                    >
                      {selectedCandidate.availability_status.split('_').join(' ')}
                    </Badge>
                  </div>
                )}

                {/* Bio */}
                {selectedCandidate.bio && (
                  <div>
                    <h4 className="font-semibold mb-2">About</h4>
                    <p className="text-sm">{selectedCandidate.bio}</p>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h4 className="font-semibold mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <h4 className="font-semibold mb-2">Experience</h4>
                  <div className="flex gap-4 text-sm">
                    {selectedCandidate.years_experience && (
                      <span>{selectedCandidate.years_experience} years</span>
                    )}
                    {selectedCandidate.experience_level && (
                      <span className="capitalize">{selectedCandidate.experience_level}</span>
                    )}
                  </div>
                </div>

                {/* Salary */}
                {selectedCandidate.min_salary && selectedCandidate.max_salary && (
                  <div>
                    <h4 className="font-semibold mb-2">Salary Expectations</h4>
                    <p className="text-sm">
                      ${selectedCandidate.min_salary.toLocaleString()} - ${selectedCandidate.max_salary.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Location Preference */}
                {selectedCandidate.preferred_location_type && (
                  <div>
                    <h4 className="font-semibold mb-2">Location Preference</h4>
                    <p className="text-sm capitalize">{selectedCandidate.preferred_location_type}</p>
                  </div>
                )}

                {/* Portfolio */}
                {selectedCandidate.portfolio_items && selectedCandidate.portfolio_items.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Portfolio</h4>
                    <div className="space-y-2">
                      {selectedCandidate.portfolio_items.map((item: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <h5 className="font-medium">{item.title}</h5>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Project →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCandidateModal(false)}>
                  Close
                </Button>
                <Button>
                  Send Interview Invite
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give this search a name to easily access it later
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="search_name">Search Name</Label>
            <Input
              id="search_name"
              placeholder="e.g., Senior React Developers in SF"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSaveDialog(false)}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

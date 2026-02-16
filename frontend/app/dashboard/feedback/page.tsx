/**
 * Feedback Tracking Page
 * Issue #139: View and track submitted feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bug, Lightbulb, MessageCircle, MessageSquare, Filter, ChevronRight } from 'lucide-react';
import { formatDate, formatDateTimeLong } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'general';
  title?: string;
  message: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  date: string;
  trackingId?: string;
  responses?: Array<{
    id: string;
    message: string;
    author: string;
    date: string;
  }>;
}

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [filteredList, setFilteredList] = useState<FeedbackItem[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'bug' | 'feature' | 'general'>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user's feedback from API
    const fetchFeedback = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/feedback/my-feedback');

        if (response.ok) {
          const result = await response.json();
          const feedbackData = result.data?.feedback || result.feedback || [];

          // Transform API data to match component interface
          const transformedData = feedbackData.map((item: any) => ({
            id: item.id,
            type: item.type === 'bug_report' ? 'bug' : item.type === 'feature_request' ? 'feature' : 'general',
            title: item.title,
            message: item.description || item.message || '',
            status: item.status?.replace('_', '-') || 'pending',
            date: item.created_at || item.date,
            trackingId: item.tracking_id || item.id,
            responses: item.responses || [],
          }));

          setFeedbackList(transformedData);
          setFilteredList(transformedData);
        }
      } catch (error) {
        console.error('Failed to fetch feedback:', error);
        toast.error('Failed to load feedback. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  useEffect(() => {
    if (selectedType === 'all') {
      setFilteredList(feedbackList);
    } else {
      setFilteredList(feedbackList.filter(item => item.type === selectedType));
    }
  }, [selectedType, feedbackList]);

  const getStatusColor = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-5 w-5 text-red-600" />;
      case 'feature':
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
      case 'general':
        return <MessageCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeName = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'bug':
        return 'Bug Report';
      case 'feature':
        return 'Feature Request';
      case 'general':
        return 'General Feedback';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Feedback</h1>
        <p className="text-gray-600">Track your submitted feedback and see updates from our team</p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-600" />
        <Select value={selectedType} onValueChange={(value: string) => setSelectedType(value as 'all' | 'bug' | 'feature' | 'general')}>
          <SelectTrigger className="w-48" data-filter-feedback>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-filter-option="all">All Feedback</SelectItem>
            <SelectItem value="bug" data-filter-option="bug">Bug Reports</SelectItem>
            <SelectItem value="feature" data-filter-option="feature">Feature Requests</SelectItem>
            <SelectItem value="general" data-filter-option="general">General Feedback</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-gray-600">
          {filteredList.length} {filteredList.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading feedback...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredList.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="No feedback submitted"
          description="Help us improve HireFlux by sharing your thoughts, reporting bugs, or suggesting features."
        />
      )}

      {/* Feedback List */}
      {!isLoading && filteredList.length > 0 && (
        <div className="space-y-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              data-feedback-item
              data-feedback-id={item.id}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              tabIndex={0}
              role="button"
              onClick={() => setSelectedFeedback(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFeedback(item); } }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Type & Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {getTypeName(item.type)}
                    </span>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace('-', ' ')}
                    </Badge>
                  </div>

                  {/* Title */}
                  {item.title && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                  )}

                  {/* Message Preview */}
                  <p className="text-gray-600 line-clamp-2 mb-3">
                    {item.message}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span data-feedback-date>
                      {formatDate(item.date)}
                    </span>
                    {item.trackingId && (
                      <span className="font-mono text-xs">
                        {item.trackingId}
                      </span>
                    )}
                    {item.responses && item.responses.length > 0 && (
                      <span className="text-blue-600 font-medium">
                        {item.responses.length} {item.responses.length === 1 ? 'response' : 'responses'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Details Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-feedback-details>
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {getTypeIcon(selectedFeedback.type)}
                  <span>{getTypeName(selectedFeedback.type)}</span>
                  <Badge className={getStatusColor(selectedFeedback.status)}>
                    {selectedFeedback.status.replace('-', ' ')}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Title */}
                {selectedFeedback.title && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedFeedback.title}
                    </h3>
                  </div>
                )}

                {/* Message */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </p>
                </div>

                {/* Meta Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Submitted</span>
                    <span className="font-medium text-gray-900" data-feedback-date>
                      {formatDateTimeLong(selectedFeedback.date)}
                    </span>
                  </div>
                  {selectedFeedback.trackingId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tracking ID</span>
                      <span className="font-mono text-xs font-medium text-gray-900">
                        {selectedFeedback.trackingId}
                      </span>
                    </div>
                  )}
                </div>

                {/* Team Responses */}
                <div data-feedback-responses>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Team Updates</h4>
                  {selectedFeedback.responses && selectedFeedback.responses.length > 0 ? (
                    <div className="space-y-4">
                      {selectedFeedback.responses.map((response) => (
                        <div
                          key={response.id}
                          className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {response.author}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(response.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {response.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 text-sm">
                        No responses yet. Our team will review your feedback soon.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setSelectedFeedback(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

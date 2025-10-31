/**
 * Tests for AlertDialog Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

describe('AlertDialog Component', () => {
  const AlertDialogExample = ({ open = true, onOpenChange = jest.fn() }) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Are you sure?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  it('should render when open is true', () => {
    render(<AlertDialogExample />);

    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone. Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<AlertDialogExample open={false} />);

    expect(screen.queryByText('Delete Account')).not.toBeInTheDocument();
  });

  it('should call onOpenChange when overlay is clicked', () => {
    const handleOpenChange = jest.fn();
    render(<AlertDialogExample onOpenChange={handleOpenChange} />);

    // Click the overlay (the element with bg-black/50 class)
    const overlay = document.querySelector('.bg-black\\/50');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onClick when action button is clicked', () => {
    const handleClick = jest.fn();
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogAction onClick={handleClick}>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );

    const actionButton = screen.getByText('Confirm');
    fireEvent.click(actionButton);

    expect(handleClick).toHaveBeenCalled();
  });

  it('should call onClick when cancel button is clicked', () => {
    const handleClick = jest.fn();
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogCancel onClick={handleClick}>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(handleClick).toHaveBeenCalled();
  });

  it('should disable action button when disabled prop is true', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogAction disabled>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );

    const actionButton = screen.getByText('Confirm');
    expect(actionButton).toBeDisabled();
  });

  it('should disable cancel button when disabled prop is true', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogCancel disabled>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('should not call onClick when action button is disabled', () => {
    const handleClick = jest.fn();
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogAction disabled onClick={handleClick}>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );

    const actionButton = screen.getByText('Confirm');
    fireEvent.click(actionButton);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className to AlertDialogContent', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent className="custom-content">
          <AlertDialogTitle>Test</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    );

    const content = screen.getByText('Test').closest('.custom-content');
    expect(content).toBeInTheDocument();
  });

  it('should apply custom className to action button', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogAction className="custom-action">Action</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );

    const actionButton = screen.getByText('Action');
    expect(actionButton).toHaveClass('custom-action');
  });

  it('should apply custom className to cancel button', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogCancel className="custom-cancel">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toHaveClass('custom-cancel');
  });

  it('should have correct styling for action button', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );

    const actionButton = screen.getByText('Confirm');
    expect(actionButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should have correct styling for cancel button', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toHaveClass('border', 'border-gray-300');
  });

  it('should render header with correct styling', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );

    const title = screen.getByText('Title');
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });

  it('should render description with correct styling', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogDescription>Description text</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>
    );

    const description = screen.getByText('Description text');
    expect(description).toHaveClass('text-sm', 'text-gray-500');
  });

  it('should have z-50 class for proper stacking', () => {
    render(<AlertDialogExample />);

    const dialog = screen.getByText('Delete Account').closest('.z-50');
    expect(dialog).toBeInTheDocument();
  });
});

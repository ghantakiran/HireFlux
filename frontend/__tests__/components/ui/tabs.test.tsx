/**
 * Tests for Tabs Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

describe('Tabs Component', () => {
  const TabsExample = ({ defaultValue = 'tab1', onValueChange }: { defaultValue?: string; onValueChange?: (value: string) => void }) => (
    <Tabs defaultValue={defaultValue} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3" disabled>Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
      <TabsContent value="tab3">Content 3</TabsContent>
    </Tabs>
  );

  it('should render tabs with default value', () => {
    render(<TabsExample />);

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('should switch tabs when clicked', () => {
    render(<TabsExample />);

    const tab2Trigger = screen.getByText('Tab 2');
    fireEvent.click(tab2Trigger);

    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('should call onValueChange when tab changes', () => {
    const handleChange = jest.fn();
    render(<TabsExample onValueChange={handleChange} />);

    const tab2Trigger = screen.getByText('Tab 2');
    fireEvent.click(tab2Trigger);

    expect(handleChange).toHaveBeenCalledWith('tab2');
  });

  it('should not switch to disabled tab', () => {
    render(<TabsExample />);

    const tab3Trigger = screen.getByText('Tab 3');
    fireEvent.click(tab3Trigger);

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<TabsExample />);

    const tab1Trigger = screen.getByText('Tab 1');
    const tab2Trigger = screen.getByText('Tab 2');

    expect(tab1Trigger).toHaveClass('bg-white');
    expect(tab2Trigger).not.toHaveClass('bg-white');

    fireEvent.click(tab2Trigger);

    expect(tab1Trigger).not.toHaveClass('bg-white');
    expect(tab2Trigger).toHaveClass('bg-white');
  });

  it('should show correct tab content based on defaultValue', () => {
    render(<TabsExample defaultValue="tab2" />);

    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('should have disabled styling on disabled tab', () => {
    render(<TabsExample />);

    const tab3Trigger = screen.getByText('Tab 3');
    expect(tab3Trigger).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should work as controlled component', () => {
    const ControlledTabs = () => {
      const [value, setValue] = React.useState('tab1');

      return (
        <>
          <button onClick={() => setValue('tab2')}>Switch to Tab 2</button>
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content 1</TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
          </Tabs>
        </>
      );
    };

    render(<ControlledTabs />);

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    const button = screen.getByText('Switch to Tab 2');
    fireEvent.click(button);

    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('should apply custom className to Tabs', () => {
    render(
      <Tabs defaultValue="tab1" className="custom-tabs">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    const tabsContainer = screen.getByText('Tab 1').closest('.custom-tabs');
    expect(tabsContainer).toBeInTheDocument();
  });

  it('should apply custom className to TabsList', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    const tabsList = screen.getByText('Tab 1').parentElement;
    expect(tabsList).toHaveClass('custom-list');
  });
});

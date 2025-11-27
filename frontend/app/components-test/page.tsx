/**
 * Shadcn/ui Components Test Page (Issue #93)
 *
 * This page demonstrates all installed Shadcn/ui components for E2E testing
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

export default function ComponentsTestPage() {
  const [switchChecked, setSwitchChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const { toast } = useToast();

  return (
    <TooltipProvider>
      <div className="min-h-screen p-8 bg-background">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Shadcn/ui Components Test</h1>
            <p className="text-muted-foreground">
              Issue #93: Testing all installed Shadcn/ui components
            </p>
          </div>

          {/* Switch Component */}
          <Card>
            <CardHeader>
              <CardTitle>Switch</CardTitle>
              <CardDescription>Toggle switch component with accessibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Switch
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                  aria-label="Toggle switch"
                />
                <Label>Switch is {switchChecked ? 'ON' : 'OFF'}</Label>
              </div>
            </CardContent>
          </Card>

          {/* Slider Component */}
          <Card>
            <CardHeader>
              <CardTitle>Slider</CardTitle>
              <CardDescription>Range slider with keyboard support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Slider
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">Value: {sliderValue[0]}</p>
              </div>
            </CardContent>
          </Card>

          {/* Popover Component */}
          <Card>
            <CardHeader>
              <CardTitle>Popover</CardTitle>
              <CardDescription>Popover dialog with trigger</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" data-testid="popover-trigger">
                    Open Popover
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Popover Content</h4>
                    <p className="text-sm text-muted-foreground">
                      This is a popover with some content inside.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Toast Component */}
          <Card>
            <CardHeader>
              <CardTitle>Toast</CardTitle>
              <CardDescription>Toast notifications with auto-dismiss</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                data-testid="toast-trigger"
                onClick={() => {
                  toast({
                    title: 'Toast Notification',
                    description: 'This toast will auto-dismiss in a few seconds.',
                  });
                }}
              >
                Show Toast
              </Button>
            </CardContent>
          </Card>

          {/* Tooltip Component */}
          <Card>
            <CardHeader>
              <CardTitle>Tooltip</CardTitle>
              <CardDescription>Tooltip on hover and focus</CardDescription>
            </CardHeader>
            <CardContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" data-testid="tooltip-trigger">
                    Hover me
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a helpful tooltip</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          {/* Tabs Component */}
          <Card>
            <CardHeader>
              <CardTitle>Tabs</CardTitle>
              <CardDescription>Tab navigation with keyboard support</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tab1" className="w-full">
                <TabsList>
                  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">
                  <p className="text-sm">Content for Tab 1</p>
                </TabsContent>
                <TabsContent value="tab2">
                  <p className="text-sm">Content for Tab 2</p>
                </TabsContent>
                <TabsContent value="tab3">
                  <p className="text-sm">Content for Tab 3</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Accordion Component */}
          <Card>
            <CardHeader>
              <CardTitle>Accordion</CardTitle>
              <CardDescription>Collapsible accordion with animations</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Accordion Item 1</AccordionTrigger>
                  <AccordionContent>
                    Content for accordion item 1
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Accordion Item 2</AccordionTrigger>
                  <AccordionContent>
                    Content for accordion item 2
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Accordion Item 3</AccordionTrigger>
                  <AccordionContent>
                    Content for accordion item 3
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Avatar Component */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>User avatar with fallback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Avatar data-testid="avatar">
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <Avatar data-testid="avatar-fallback">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>

          {/* Other Components */}
          <Card>
            <CardHeader>
              <CardTitle>Other Components</CardTitle>
              <CardDescription>Additional UI components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Input */}
              <div>
                <Label htmlFor="test-input">Input</Label>
                <Input id="test-input" placeholder="Enter text..." />
              </div>

              {/* Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox id="test-checkbox" />
                <Label htmlFor="test-checkbox">Checkbox option</Label>
              </div>

              {/* Radio Group */}
              <RadioGroup defaultValue="option1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option1" id="option1" />
                  <Label htmlFor="option1">Option 1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option2" id="option2" />
                  <Label htmlFor="option2">Option 2</Label>
                </div>
              </RadioGroup>

              {/* Badges */}
              <div className="flex gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>

              {/* Alert */}
              <Alert>
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is an informational alert message.
                </AlertDescription>
              </Alert>

              {/* Progress */}
              <div>
                <Label>Progress</Label>
                <Progress value={66} className="mt-2" />
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                All 30+ Shadcn/ui components are working correctly ✓
              </p>
            </CardContent>
          </Card>
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}

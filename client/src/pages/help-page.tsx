import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Video, 
  Mail, 
  PhoneCall,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function HelpPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportSubject, setSupportSubject] = useState("");

  const handleSubmitSupportRequest = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would send the support request to the backend
    toast({
      title: "Support request submitted",
      description: "We'll get back to you as soon as possible.",
    });
    setSupportMessage("");
    setSupportSubject("");
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Get help, documentation, and support for using the Business Management System
          </p>
        </div>
      </div>

      <Tabs defaultValue="faqs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="faqs" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Tutorials
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Support
          </TabsTrigger>
        </TabsList>

        {/* FAQs Tab */}
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find answers to common questions about using the system
              </CardDescription>
              <div className="mt-2">
                <Input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No FAQs match your search query.</p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>System Documentation</CardTitle>
              <CardDescription>
                Detailed guides and documentation for using the Business Management System
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentationSections.map((section, index) => (
                  <Card key={index} className="border cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-2">{section.description}</p>
                      <Button variant="outline" className="w-full mt-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        View Documentation
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Tutorials Tab */}
        <TabsContent value="tutorials">
          <Card>
            <CardHeader>
              <CardTitle>Video Tutorials</CardTitle>
              <CardDescription>
                Watch step-by-step video tutorials on how to use different features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {videoTutorials.map((video, index) => (
                  <Card key={index} className="border">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <Video className="h-12 w-12 text-gray-400" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm mb-2">{video.description}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>Duration: {video.duration}</span>
                      </div>
                      <Button variant="outline" className="w-full mt-3 flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Watch Tutorial
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Support Tab */}
        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>
                  Submit a support request and we'll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitSupportRequest} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Your Email
                    </label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@example.com"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium">
                      Subject
                    </label>
                    <Input 
                      id="subject" 
                      placeholder="Brief description of your issue"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">
                      Message
                    </label>
                    <Textarea 
                      id="message" 
                      placeholder="Describe your issue in detail..."
                      rows={6}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Submit Support Request</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Alternative ways to get in touch with our support team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Email Support</h3>
                    <p className="text-sm text-muted-foreground">support@businessmgmt.com</p>
                    <p className="text-sm text-muted-foreground">Response time: 24-48 hours</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <PhoneCall className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Phone Support</h3>
                    <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                    <p className="text-sm text-muted-foreground">Mon-Fri: 9AM-5PM EST</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <LinkIcon className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Knowledge Base</h3>
                    <p className="text-sm text-muted-foreground">
                      Visit our online knowledge base for self-service support resources
                    </p>
                    <Button variant="link" className="p-0 h-auto text-primary">
                      Browse Knowledge Base
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sample data
const faqs = [
  {
    question: "How do I create a new project?",
    answer: "To create a new project, navigate to the <strong>Projects</strong> section from the sidebar, then click the <strong>+ New Project</strong> button in the top right corner. Fill in the required information in the form and click <strong>Create Project</strong>."
  },
  {
    question: "How do I generate a quote?",
    answer: "To generate a quote, go to the <strong>Quotes</strong> section, click <strong>+ New Quote</strong>, select a customer and project, add line items, and click <strong>Create Quote</strong>. You can then send the quote directly to the customer via email."
  },
  {
    question: "How do I convert a quote to an invoice?",
    answer: "Open the quote you want to convert from the <strong>Quotes</strong> section. Click the <strong>Convert to Invoice</strong> button at the top right of the quote details page. Review the invoice details and click <strong>Create Invoice</strong>."
  },
  {
    question: "How do I schedule a survey?",
    answer: "After a quote is accepted, go to the <strong>Surveys</strong> section and click <strong>+ New Survey</strong>. Select the project, assign employees, choose a date and time, and click <strong>Schedule Survey</strong>."
  },
  {
    question: "How do I track inventory?",
    answer: "The <strong>Inventory</strong> section provides a complete view of your stock levels. You can add new items, update quantities, set reorder points, and view inventory value. Low stock items are automatically highlighted."
  },
  {
    question: "How do I create a purchase order?",
    answer: "Go to the <strong>Purchase Orders</strong> section and click <strong>+ New Purchase Order</strong>. Select a supplier, add items you want to order, specify quantities, and click <strong>Create Purchase Order</strong>."
  },
  {
    question: "How do I manage employee timesheets?",
    answer: "Employees can submit their hours in the <strong>Timesheets</strong> section. As an administrator, you can review, approve, or reject timesheet entries. Reports can be generated for payroll processing."
  },
  {
    question: "How do I customize system terminology?",
    answer: "Navigate to <strong>Settings</strong> and select the <strong>Terminology</strong> tab. Here you can customize terms used throughout the system to match your business terminology."
  },
  {
    question: "How do I update my company information?",
    answer: "Go to <strong>Settings</strong> and select the <strong>Company</strong> tab. You can update your company details, logo, tax information, and default settings."
  },
  {
    question: "How do I manage user access and permissions?",
    answer: "In the <strong>Settings</strong> section, select the <strong>Users & Permissions</strong> tab. Here you can add new users, assign roles, and configure specific permissions for each user."
  }
];

const documentationSections = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of setting up and using the system for the first time."
  },
  {
    title: "Project Management",
    description: "Detailed documentation on managing projects, timelines, and resources."
  },
  {
    title: "Financial Management",
    description: "Guide to quotes, invoices, expenses, and financial reporting."
  },
  {
    title: "Customer Management",
    description: "How to manage customer information, communication, and history."
  },
  {
    title: "Inventory & Suppliers",
    description: "Documentation on inventory tracking, supplier management, and ordering."
  },
  {
    title: "Employee & Timesheet Management",
    description: "Guide to managing employees, timesheets, and scheduling."
  },
  {
    title: "System Configuration",
    description: "Detailed information on customizing the system to fit your business needs."
  },
  {
    title: "API Documentation",
    description: "Technical documentation for developers integrating with the system API."
  }
];

const videoTutorials = [
  {
    title: "Getting Started Overview",
    description: "A complete overview of the system and basic navigation.",
    duration: "5:32"
  },
  {
    title: "Creating and Managing Projects",
    description: "Learn how to create, edit, and track projects effectively.",
    duration: "8:17"
  },
  {
    title: "Quote & Invoice Workflow",
    description: "Master the quote-to-invoice process for better financials.",
    duration: "12:45"
  },
  {
    title: "Survey & Installation Management",
    description: "Efficiently schedule and manage site surveys and installations.",
    duration: "9:23"
  },
  {
    title: "Inventory Management",
    description: "Track stock levels and manage purchase orders.",
    duration: "7:48"
  },
  {
    title: "Reporting & Analytics",
    description: "Generate insightful reports for better business decisions.",
    duration: "10:12"
  }
];
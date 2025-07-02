import { Link } from "wouter";
import { Rocket, FolderClosed, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WelcomeEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Welcome Hero Section */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Rocket className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Business Hub
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Get started by creating your first project, adding customers, or generating quotes. 
            Everything you need to manage your business efficiently.
          </p>
        </div>

        {/* Quick Start Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/projects/new">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-200">
              <CardHeader className="text-center">
                <FolderClosed className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                <CardTitle className="text-lg">Create Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Start your first business project</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/customers">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-green-200">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <CardTitle className="text-lg">Add Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Build your customer database</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/quotes">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-purple-200">
              <CardHeader className="text-center">
                <FileText className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                <CardTitle className="text-lg">Generate Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Create your first business quote</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Getting Started Checklist */}
        <Card className="text-left">
          <CardHeader>
            <CardTitle className="text-center">Getting Started Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-300 rounded mr-3"></div>
                <span className="text-gray-700">Set up your company profile and settings</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-300 rounded mr-3"></div>
                <span className="text-gray-700">Add your first customer</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-300 rounded mr-3"></div>
                <span className="text-gray-700">Create your first project</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-300 rounded mr-3"></div>
                <span className="text-gray-700">Generate and send your first quote</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Need help getting started?
          </p>
          <div className="space-x-4">
            <Link to="/help">
              <Button variant="outline" size="sm">
                View Help Guide
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                Company Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
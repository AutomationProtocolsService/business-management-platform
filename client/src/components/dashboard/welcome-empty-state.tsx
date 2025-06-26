import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Rocket, 
  FileText, 
  Users, 
  TrendingUp,
  CheckCircle,
  ArrowRight
} from "lucide-react";

export function WelcomeEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-6 max-w-2xl">
        {/* Welcome Icon */}
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
          <Rocket className="w-12 h-12 text-white" />
        </div>

        {/* Welcome Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Your Business Management System!
          </h1>
          <p className="text-lg text-gray-600">
            You're all set up. Let's get your business running.
          </p>
        </div>

        {/* Quick Start Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create Your First Project</h3>
              <p className="text-sm text-gray-600 mb-4">Start by creating a project to organize your work</p>
              <Link to="/projects/new">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-gray-200 hover:border-green-300 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Add Your First Customer</h3>
              <p className="text-sm text-gray-600 mb-4">Add customers to start building relationships</p>
              <Link to="/customers/new">
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create a Quote</h3>
              <p className="text-sm text-gray-600 mb-4">Generate professional quotes for your clients</p>
              <Link to="/quotes/new">
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  New Quote
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Steps */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Getting Started Checklist
          </h2>
          <div className="space-y-3 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900">Set up your first project</p>
                <p className="text-sm text-gray-600">Create a project to organize your work and track progress</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900">Add your customers</p>
                <p className="text-sm text-gray-600">Build your customer database for better relationship management</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900">Create quotes and invoices</p>
                <p className="text-sm text-gray-600">Generate professional documents to grow your business</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900">Track your business metrics</p>
                <p className="text-sm text-gray-600">Monitor performance and make data-driven decisions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Need help getting started?</h3>
                <p className="text-sm text-gray-600">Check out our guides and documentation</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center">
              Learn More
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
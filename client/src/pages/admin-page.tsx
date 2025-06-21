import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Plus,
  Crown,
  Users2,
  Award,
  Mail,
  Ban
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLogin: string | null;
}

interface Team {
  id: number;
  name: string;
  description: string;
  teamAdminId: number | null;
  active: boolean;
  createdAt: string;
}

interface Permission {
  id: number;
  userId: number;
  resourceType: string;
  resourceId: string;
  actions: string[];
  grantedAt: string;
  expiresAt: string | null;
  active: boolean;
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: true
  });

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/admin/teams'],
    enabled: true
  });

  // User invitation mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to invite user');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User invited successfully" });
      setInviteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to invite user", description: error.message, variant: "destructive" });
    }
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      const response = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    }
  });

  // Disable user mutation
  const disableUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch('/api/admin/users/disable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to disable user');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User disabled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to disable user", description: error.message, variant: "destructive" });
    }
  });

  // Enable user mutation
  const enableUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch('/api/admin/users/enable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to enable user');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User enabled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to enable user", description: error.message, variant: "destructive" });
    }
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove user');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User removed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove user", description: error.message, variant: "destructive" });
    }
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; teamAdminId?: number }) => {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create team');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team created successfully" });
      setTeamDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    }
  });

  // Grant permission mutation
  const grantPermissionMutation = useMutation({
    mutationFn: async (data: { userId: number; resourceType: string; resourceId: string; actions: string[] }) => {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to grant permission');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Permission granted successfully" });
      setPermissionDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to grant permission", description: error.message, variant: "destructive" });
    }
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3" />;
      case 'manager': return <Award className="w-3 h-3" />;
      case 'employee': return <Users className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant="outline" className="px-3 py-1">
          <Shield className="w-4 h-4 mr-2" />
          Administrator Access
        </Badge>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users2 className="w-4 h-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>User Management</CardTitle>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    inviteUserMutation.mutate({
                      email: formData.get('email') as string,
                      role: formData.get('role') as string
                    });
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select name="role" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={inviteUserMutation.isPending}>
                      {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(users) && users.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1">{user.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? "default" : "secondary"}>
                            {user.active ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/users/${user.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            
                            <Button
                              size="sm"
                              variant={user.active ? "destructive" : "default"}
                              onClick={() => {
                                if (user.active) {
                                  disableUserMutation.mutate(user.id);
                                } else {
                                  enableUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={disableUserMutation.isPending || enableUserMutation.isPending}
                            >
                              {user.active ? (
                                <>
                                  <Ban className="w-4 h-4 mr-1" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 mr-1" />
                                  Enable
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove ${user.fullName}? This action cannot be undone.`)) {
                                  removeUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={removeUserMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Team Management</CardTitle>
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const teamAdminId = formData.get('teamAdminId') as string;
                    createTeamMutation.mutate({
                      name: formData.get('name') as string,
                      description: formData.get('description') as string,
                      teamAdminId: teamAdminId ? parseInt(teamAdminId) : undefined
                    });
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Team Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" />
                    </div>
                    <div>
                      <Label htmlFor="teamAdminId">Team Administrator (Manager)</Label>
                      <Select name="teamAdminId">
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(users) && users.filter((u: User) => u.role === 'manager').map((manager: User) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={createTeamMutation.isPending}>
                      {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="text-center py-8">Loading teams...</div>
              ) : (
                <div className="grid gap-4">
                  {teams.map((team: Team) => (
                    <Card key={team.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{team.name}</h3>
                            <p className="text-sm text-gray-600">{team.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Created: {new Date(team.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={team.active ? "default" : "secondary"}>
                            {team.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Resource Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Select a user from the Users tab to manage their specific resource permissions.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permission Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Grant Resource Permission - {selectedUser?.fullName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const actions = Array.from(formData.getAll('actions')) as string[];
            
            if (selectedUser && actions.length > 0) {
              grantPermissionMutation.mutate({
                userId: selectedUser.id,
                resourceType: formData.get('resourceType') as string,
                resourceId: formData.get('resourceId') as string,
                actions
              });
            }
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resourceType">Resource Type</Label>
                <Select name="resourceType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resourceId">Resource ID</Label>
                <Input id="resourceId" name="resourceId" placeholder="e.g., 123" required />
              </div>
            </div>
            
            <div>
              <Label>Actions (select multiple)</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['view', 'edit', 'approve', 'comment', 'delete'].map((action) => (
                  <label key={action} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="actions"
                      value={action}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{action}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <Button type="submit" disabled={grantPermissionMutation.isPending}>
              {grantPermissionMutation.isPending ? "Granting..." : "Grant Permission"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Crown, 
  Award, 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff,
  Edit,
  Save,
  X
} from "lucide-react";
import { Link } from "wouter";

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

interface Project {
  id: number;
  name: string;
  status: string;
}

export default function UserDetailsPage() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);

  // Fetch user details
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/admin/users/${userId}`],
    enabled: !!userId
  });

  // Fetch user permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: [`/api/admin/users/${userId}/permissions`],
    enabled: !!userId
  });

  // Fetch projects for permission selection
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects']
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    }
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User role updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    }
  });

  // Grant permission mutation
  const grantPermissionMutation = useMutation({
    mutationFn: async (data: { resourceType: string; resourceId: string; actions: string[] }) => {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data })
      });
      if (!response.ok) throw new Error('Failed to grant permission');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Permission granted successfully" });
      setPermissionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/permissions`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to grant permission", description: error.message, variant: "destructive" });
    }
  });

  // Revoke permission mutation
  const revokePermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      const response = await fetch(`/api/admin/permissions/${permissionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to revoke permission');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Permission revoked successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/permissions`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to revoke permission", description: error.message, variant: "destructive" });
    }
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (action: 'disable' | 'enable') => {
      const response = await fetch(`/api/admin/users/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error(`Failed to ${action} user`);
      return response.json();
    },
    onSuccess: (_, action) => {
      toast({ title: `User ${action}d successfully` });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user status", description: error.message, variant: "destructive" });
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

  const handleSaveUser = () => {
    updateUserMutation.mutate(editedUser);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedUser({});
  };

  if (userLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">User not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{user.fullName}</h1>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRoleBadgeColor(user.role)}>
            {getRoleIcon(user.role)}
            <span className="ml-1">{user.role}</span>
          </Badge>
          <Badge variant={user.active ? "default" : "secondary"}>
            {user.active ? "Active" : "Disabled"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>User Information</CardTitle>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveUser} disabled={updateUserMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={editedUser.fullName ?? user.fullName}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1">{user.fullName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={editedUser.username ?? user.username}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, username: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1">{user.username}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedUser.email ?? user.email}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1">{user.email}</p>
                )}
              </div>
              <div>
                <Label>Created</Label>
                <p className="mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Last Login</Label>
                <p className="mt-1">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Management */}
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="role">Primary Role</Label>
              <Select
                value={user.role}
                onValueChange={(newRole) => updateRoleMutation.mutate(newRole)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant={user.active ? "destructive" : "default"}
                onClick={() => toggleUserStatusMutation.mutate(user.active ? 'disable' : 'enable')}
                disabled={toggleUserStatusMutation.isPending}
              >
                {user.active ? (
                  <>
                    <PowerOff className="w-4 h-4 mr-2" />
                    Disable User
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 mr-2" />
                    Enable User
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fine-Grained Permissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Fine-Grained Permissions</CardTitle>
          <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Grant New Permission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Grant Permission to {user.fullName}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const actions = Array.from(formData.getAll('actions')) as string[];
                
                if (actions.length > 0) {
                  grantPermissionMutation.mutate({
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
                        <SelectItem value="quote">Quote</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="report">Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="resourceId">Specific Resource</Label>
                    <Select name="resourceId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific resource" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project: Project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Allowed Actions</Label>
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
        </CardHeader>
        <CardContent>
          {permissionsLoading ? (
            <div className="text-center py-8">Loading permissions...</div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No custom permissions granted yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission: Permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="capitalize">{permission.resourceType}</TableCell>
                    <TableCell>{permission.resourceId}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {permission.actions.map((action) => (
                          <Badge key={action} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(permission.grantedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokePermissionMutation.mutate(permission.id)}
                        disabled={revokePermissionMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Users, 
  Plus, 
  Trash2, 
  Edit,
  Crown,
  Award,
  UserPlus,
  UserMinus,
  Shield
} from "lucide-react";
import { Link } from "wouter";

interface Team {
  id: number;
  name: string;
  description: string | null;
  teamAdminId: number | null;
  createdAt: string;
  active: boolean;
  memberCount?: number;
  teamAdmin?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface TeamMember {
  id: number;
  userId: number;
  teamId: number;
  role: string;
  joinedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function TeamsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/admin/teams']
  });

  // Fetch team members for selected team
  const { data: teamMembers = [] } = useQuery({
    queryKey: [`/api/admin/teams/${selectedTeam?.id}/members`],
    enabled: !!selectedTeam?.id
  });

  // Fetch all users for adding to teams
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users']
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
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
      setCreateTeamDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    }
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete team');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      setSelectedTeam(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    }
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { teamId: number; userId: number; role: string }) => {
      const response = await fetch('/api/admin/teams/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add team member');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team member added successfully" });
      setAddMemberDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/teams/${selectedTeam?.id}/members`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add team member", description: error.message, variant: "destructive" });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/admin/teams/members/${memberId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove team member');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team member removed successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/teams/${selectedTeam?.id}/members`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove team member", description: error.message, variant: "destructive" });
    }
  });

  // Assign team admin mutation
  const assignTeamAdminMutation = useMutation({
    mutationFn: async (data: { teamId: number; userId: number }) => {
      const response = await fetch('/api/admin/teams/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to assign team admin');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team admin assigned successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/teams/${selectedTeam?.id}/members`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to assign team admin", description: error.message, variant: "destructive" });
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

  const availableUsers = Array.isArray(allUsers) ? allUsers.filter((user: User) => 
    !Array.isArray(teamMembers) ? true : !teamMembers.some((member: TeamMember) => member.userId === user.id)
  ) : [];

  const managerMembers = Array.isArray(teamMembers) ? teamMembers.filter((member: TeamMember) => 
    member.user && member.user.role === 'manager'
  ) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Administration</h1>
          <p className="text-gray-500">Manage teams and assign team administrators</p>
        </div>
        <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
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
              createTeamMutation.mutate({
                name: formData.get('name') as string,
                description: formData.get('description') as string
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Enter team description"
                />
              </div>
              <Button type="submit" disabled={createTeamMutation.isPending}>
                {createTeamMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Teams List */}
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="text-center py-8">Loading teams...</div>
            ) : !Array.isArray(teams) || teams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No teams created yet.
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team: Team) => (
                  <div
                    key={team.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTeam?.id === team.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-gray-500">{team.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {team.memberCount || 0} members
                          </Badge>
                          {team.teamAdmin && (
                            <Badge variant="outline">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin: {team.teamAdmin.fullName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this team?')) {
                            deleteTeamMutation.mutate(team.id);
                          }
                        }}
                        disabled={deleteTeamMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>
              {selectedTeam ? `${selectedTeam.name} Members` : 'Select a Team'}
            </CardTitle>
            {selectedTeam && (
              <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to {selectedTeam.name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const userId = parseInt(formData.get('userId') as string);
                    const role = formData.get('role') as string;
                    
                    if (selectedTeam) {
                      addMemberMutation.mutate({
                        teamId: selectedTeam.id,
                        userId,
                        role
                      });
                    }
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="userId">Select User</Label>
                      <Select name="userId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user to add" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="role">Team Role</Label>
                      <Select name="role" defaultValue="member" required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={addMemberMutation.isPending}>
                      {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedTeam ? (
              <div className="text-center py-8 text-gray-500">
                Select a team to view its members
              </div>
            ) : !Array.isArray(teamMembers) || teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No members in this team yet.
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(teamMembers) && teamMembers.map((member: TeamMember) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.user.fullName}</div>
                            <div className="text-sm text-gray-500">{member.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleBadgeColor(member.user.role)}>
                              {getRoleIcon(member.user.role)}
                              <span className="ml-1">{member.user.role}</span>
                            </Badge>
                            {selectedTeam.teamAdminId === member.userId && (
                              <Badge variant="outline">
                                <Shield className="w-3 h-3 mr-1" />
                                Team Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {member.user.role === 'manager' && selectedTeam.teamAdminId !== member.userId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => assignTeamAdminMutation.mutate({
                                  teamId: selectedTeam.id,
                                  userId: member.userId
                                })}
                                disabled={assignTeamAdminMutation.isPending}
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Make Admin
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to remove this member?')) {
                                  removeMemberMutation.mutate(member.id);
                                }
                              }}
                              disabled={removeMemberMutation.isPending}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {managerMembers.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Team Admin Assignment</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Only Manager-level users can be assigned as Team Admins. Current managers in this team:
                    </p>
                    <div className="space-y-2">
                      {managerMembers.map((member: TeamMember) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <span className="text-sm">{member.user.fullName}</span>
                          {selectedTeam.teamAdminId === member.userId ? (
                            <Badge variant="outline">
                              <Shield className="w-3 h-3 mr-1" />
                              Current Team Admin
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => assignTeamAdminMutation.mutate({
                                teamId: selectedTeam.id,
                                userId: member.userId
                              })}
                              disabled={assignTeamAdminMutation.isPending}
                            >
                              Assign as Admin
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
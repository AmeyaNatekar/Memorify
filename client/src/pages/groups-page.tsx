import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Group, GroupWithMembers, ImageWithShares } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import TopNavBar from "@/components/layout/top-nav-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ImageGrid from "@/components/images/image-grid";
import ImageUploadModal from "@/components/images/image-upload-modal";
import ImagePreviewModal from "@/components/images/image-preview-modal";
import { Loader2, UserPlus, Image as ImageIcon, Users } from "lucide-react";

const groupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  description: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export default function GroupsPage() {
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageWithShares | null>(null);
  
  const { toast } = useToast();

  // Fetch user's groups
  const { data: groups, isLoading: isGroupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Fetch selected group details
  const { data: groupDetails, isLoading: isGroupDetailsLoading } = useQuery<GroupWithMembers>({
    queryKey: ["/api/groups", selectedGroup?.id],
    enabled: !!selectedGroup,
  });

  // Fetch selected group images
  const { data: groupImages, isLoading: isGroupImagesLoading } = useQuery<ImageWithShares[]>({
    queryKey: ["/api/groups", selectedGroup?.id, "images"],
    enabled: !!selectedGroup,
  });

  // Create group form
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormValues) => {
      const res = await apiRequest("POST", "/api/groups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsCreateGroupModalOpen(false);
      form.reset();
      toast({
        title: "Group created",
        description: "Your new group has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenCreateGroupModal = () => {
    setIsCreateGroupModalOpen(true);
  };

  const handleCloseCreateGroupModal = () => {
    setIsCreateGroupModalOpen(false);
    form.reset();
  };

  const onCreateGroupSubmit = (data: GroupFormValues) => {
    createGroupMutation.mutate(data);
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleImagePreview = (image: ImageWithShares) => {
    setSelectedImage(image);
  };

  const handleClosePreview = () => {
    setSelectedImage(null);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto bg-neutral-50">
        <TopNavBar 
          title="Groups" 
          onUploadClick={handleOpenUploadModal}
        />
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Groups</h2>
            <Button onClick={handleOpenCreateGroupModal}>
              Create New Group
            </Button>
          </div>

          {isGroupsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card 
                  key={group.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${selectedGroup?.id === group.id ? 'border-primary' : ''}`}
                  onClick={() => handleSelectGroup(group)}
                >
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Users size={16} />
                      <span>View</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ImageIcon size={16} />
                      <span>Images</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <h3 className="text-lg font-semibold mb-2">No groups found</h3>
              <p className="text-gray-500 mb-4">
                You haven't created or joined any groups yet.
              </p>
              <Button onClick={handleOpenCreateGroupModal}>
                Create Your First Group
              </Button>
            </div>
          )}

          {/* Selected Group View */}
          {selectedGroup && (
            <div className="mt-8">
              <Tabs defaultValue="images">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{selectedGroup.name}</h3>
                  <TabsList>
                    <TabsTrigger value="images">Images</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="images">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    {isGroupImagesLoading ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : groupImages && groupImages.length > 0 ? (
                      <ImageGrid 
                        images={groupImages} 
                        isLoading={false}
                        onImagePreview={handleImagePreview}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">
                          No images have been shared in this group yet.
                        </p>
                        <Button onClick={handleOpenUploadModal}>
                          Share an Image
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="members">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    {isGroupDetailsLoading ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : groupDetails && groupDetails.members ? (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">Members ({groupDetails.members.length})</h4>
                          <Button size="sm" variant="outline" className="gap-1">
                            <UserPlus size={16} />
                            <span>Add Member</span>
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {groupDetails.members.map((member) => (
                            <div key={member.id} className="p-2 border rounded flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                {member.username.charAt(0).toUpperCase()}
                              </div>
                              <span>{member.username}</span>
                              {groupDetails.createdBy === member.id && (
                                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">Creator</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Could not load group members
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        <Dialog open={isCreateGroupModalOpen} onOpenChange={setIsCreateGroupModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group to share images with friends
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateGroupSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your group" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseCreateGroupModal}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createGroupMutation.isPending}
                  >
                    {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <ImageUploadModal 
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
          defaultSelectedGroup={selectedGroup}
        />
        
        {selectedImage && (
          <ImagePreviewModal
            image={selectedImage}
            onClose={handleClosePreview}
          />
        )}
      </main>
    </div>
  );
}

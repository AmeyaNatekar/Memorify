import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FriendWithUser, User } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import TopNavBar from "@/components/layout/top-nav-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Search, UserPlus, Users, Loader2 } from "lucide-react";

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch friends
  const { data: friends, isLoading: isFriendsLoading } = useQuery<FriendWithUser[]>({
    queryKey: ["/api/friends"],
  });

  // Fetch friend requests
  const { data: friendRequests, isLoading: isRequestsLoading } = useQuery<FriendWithUser[]>({
    queryKey: ["/api/friends/requests"],
  });

  // Search users query
  const { data: searchResults, isLoading: isSearchLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length >= 3,
  });

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (addresseeId: number) => {
      const res = await apiRequest("POST", "/api/friends/request", { addresseeId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully",
      });
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept/Decline friend request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: "accepted" | "declined" }) => {
      const res = await apiRequest("PUT", `/api/friends/requests/${requestId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request updated",
        description: "Friend request has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSendRequest = (userId: number) => {
    sendRequestMutation.mutate(userId);
  };

  const handleAcceptRequest = (requestId: number) => {
    respondToRequestMutation.mutate({ requestId, status: "accepted" });
  };

  const handleDeclineRequest = (requestId: number) => {
    respondToRequestMutation.mutate({ requestId, status: "declined" });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto bg-neutral-50">
        <TopNavBar title="Friends" hideUploadButton />
        
        <div className="p-6">
          <Tabs defaultValue="friends">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Friends</h2>
              <TabsList>
                <TabsTrigger value="friends">My Friends</TabsTrigger>
                <TabsTrigger value="requests">
                  Requests
                  {friendRequests && friendRequests.length > 0 && (
                    <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                      {friendRequests.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="find">Find Friends</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="friends">
              {isFriendsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : friends && friends.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <Card key={friend.id}>
                      <CardHeader>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            {friend.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{friend.user.username}</CardTitle>
                            <CardDescription>
                              Friends since {new Date(friend.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardFooter>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                          <Button variant="outline" size="sm">
                            Message
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                  <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                  <p className="text-gray-500 mb-4">
                    You don't have any friends yet. Go to the "Find Friends" tab to search for users.
                  </p>
                  <Button onClick={() => document.querySelector('button[value="find"]')?.click()}>
                    Find Friends
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests">
              {isRequestsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : friendRequests && friendRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friendRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            {request.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{request.user.username}</CardTitle>
                            <CardDescription>
                              Sent request on {new Date(request.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardFooter>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleAcceptRequest(request.id)}
                            variant="default" 
                            size="sm" 
                            className="flex items-center gap-1"
                            disabled={respondToRequestMutation.isPending}
                          >
                            <Check size={16} />
                            Accept
                          </Button>
                          <Button 
                            onClick={() => handleDeclineRequest(request.id)}
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            disabled={respondToRequestMutation.isPending}
                          >
                            <X size={16} />
                            Decline
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                  <h3 className="text-lg font-semibold mb-2">No friend requests</h3>
                  <p className="text-gray-500">
                    You don't have any pending friend requests.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="find">
              <Card>
                <CardHeader>
                  <CardTitle>Find Friends</CardTitle>
                  <CardDescription>
                    Search for users by username
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                      placeholder="Search for users..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={handleSearch}
                    />
                  </div>
                  
                  {searchQuery.length > 0 && searchQuery.length < 3 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Type at least 3 characters to search
                    </p>
                  )}
                  
                  {searchQuery.length >= 3 && (
                    <div className="mt-4">
                      {isSearchLoading ? (
                        <div className="flex justify-center items-center h-20">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : searchResults && searchResults.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span>{user.username}</span>
                              </div>
                              <Button 
                                onClick={() => handleSendRequest(user.id)}
                                size="sm" 
                                className="flex items-center gap-1"
                                disabled={sendRequestMutation.isPending}
                              >
                                <UserPlus size={16} />
                                Add Friend
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          No users found matching "{searchQuery}"
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

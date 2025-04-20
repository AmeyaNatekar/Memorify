import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopNavBar from "@/components/layout/top-nav-bar";
import { useQuery } from "@tanstack/react-query";
import { ImageWithShares } from "@shared/schema";
import ImageGrid from "@/components/images/image-grid";
import { useState } from "react";
import ImageUploadModal from "@/components/images/image-upload-modal";
import ImagePreviewModal from "@/components/images/image-preview-modal";

export default function HomePage() {
  const { user } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageWithShares | null>(null);

  const { data: images, isLoading } = useQuery<ImageWithShares[]>({
    queryKey: ["/api/images"],
  });

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
          title="Home" 
          onUploadClick={handleOpenUploadModal}
        />
        
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.username}!</h2>
            <p className="text-gray-600 mt-1">
              This is your personal dashboard. You can see your recent uploads, friends' activities, and more.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Recently Uploaded</h3>
            <ImageGrid 
              images={images || []} 
              isLoading={isLoading}
              onImagePreview={handleImagePreview}
            />
          </div>
        </div>

        {/* Modals */}
        <ImageUploadModal 
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
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

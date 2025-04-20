import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageWithShares } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import TopNavBar from "@/components/layout/top-nav-bar";
import TimelineFilter from "@/components/timeline/timeline-filter";
import ImageGrid from "@/components/images/image-grid";
import ImageUploadModal from "@/components/images/image-upload-modal";
import ImagePreviewModal from "@/components/images/image-preview-modal";

export default function UploadsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageWithShares | null>(null);
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number } | null>(null);

  // Fetch image dates for timeline
  const { data: dates, isLoading: isDatesLoading } = useQuery<{ year: number; month: number }[]>({
    queryKey: ["/api/images/dates"],
  });

  // Fetch images, filtered by date if selected
  const { data: images, isLoading: isImagesLoading } = useQuery<ImageWithShares[]>({
    queryKey: selectedDate 
      ? [`/api/images/by-date?year=${selectedDate.year}&month=${selectedDate.month}`] 
      : ["/api/images"],
  });

  // Group images by date for display
  const groupedImages = images ? groupImagesByDate(images) : {};

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

  const handleDateSelect = (date: { year: number; month: number } | null) => {
    setSelectedDate(date);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto bg-neutral-50">
        <TopNavBar 
          title="My Uploads" 
          onUploadClick={handleOpenUploadModal}
        />
        
        <div className="p-6">
          {/* Timeline Filter */}
          <TimelineFilter 
            dates={dates || []} 
            isLoading={isDatesLoading}
            selectedDate={selectedDate}
            onSelect={handleDateSelect}
          />
          
          {/* Images by date */}
          {isImagesLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Loading images...</p>
            </div>
          ) : images && images.length > 0 ? (
            Object.entries(groupedImages).map(([date, dateImages]) => (
              <div key={date} className="mb-8">
                <h3 className="text-lg font-medium mb-4">{date}</h3>
                <ImageGrid 
                  images={dateImages} 
                  isLoading={false}
                  onImagePreview={handleImagePreview}
                />
              </div>
            ))
          ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center mt-4">
              <h3 className="text-lg font-semibold mb-2">No images found</h3>
              <p className="text-gray-500 mb-4">
                {selectedDate ? "No images uploaded during this period." : "You haven't uploaded any images yet."}
              </p>
              <button 
                onClick={handleOpenUploadModal}
                className="px-4 py-2 bg-primary text-white rounded-md inline-flex items-center"
              >
                <span className="material-icons text-sm mr-2">add_photo_alternate</span>
                Upload your first image
              </button>
            </div>
          )}
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

// Helper function to group images by date
function groupImagesByDate(images: ImageWithShares[]): Record<string, ImageWithShares[]> {
  const grouped: Record<string, ImageWithShares[]> = {};
  
  images.forEach(image => {
    const date = new Date(image.uploadedAt);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (!grouped[formattedDate]) {
      grouped[formattedDate] = [];
    }
    
    grouped[formattedDate].push(image);
  });
  
  return grouped;
}

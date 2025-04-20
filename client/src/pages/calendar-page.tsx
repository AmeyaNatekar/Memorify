import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopNavBar from "@/components/layout/top-nav-bar";
import { useQuery } from "@tanstack/react-query";
import { ImageWithShares } from "@shared/schema";
import ImageGrid from "@/components/images/image-grid";
import { useState, useEffect } from "react";
import ImageUploadModal from "@/components/images/image-upload-modal";
import ImagePreviewModal from "@/components/images/image-preview-modal";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

export default function CalendarPage() {
  const { user } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageWithShares | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Get all dates with images
  const { data: dates, isLoading: isDatesLoading } = useQuery<{ year: number; month: number }[]>({
    queryKey: ["/api/images/dates"],
  });
  
  // Track which days have images
  const [daysWithImages, setDaysWithImages] = useState<Date[]>([]);
  
  // Calculate days with images from the dates data
  useEffect(() => {
    if (dates && dates.length > 0) {
      const days: Date[] = [];
      
      dates.forEach(({ year, month }) => {
        // For simplicity, we're marking the first day of each month
        days.push(new Date(year, month, 1));
      });
      
      setDaysWithImages(days);
    }
  }, [dates]);
  
  // Get images for the selected date (month granularity)
  const { data: images, isLoading: isImagesLoading } = useQuery<ImageWithShares[]>({
    queryKey: [
      "/api/images/by-date", 
      selectedDate ? {
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth()
      } : null
    ],
    enabled: !!selectedDate,
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
  
  // Format the selected date as a heading
  const formattedDate = selectedDate 
    ? format(selectedDate, 'MMMM yyyy') 
    : 'Select a date';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto bg-neutral-50">
        <TopNavBar 
          title="Calendar View" 
          onUploadClick={handleOpenUploadModal}
        />
        
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Image Calendar</h2>
            <p className="text-gray-600 mt-1">
              Browse your images by date. Days with images are highlighted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1">
              <CardContent className="pt-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasImage: daysWithImages
                  }}
                  modifiersClassNames={{
                    hasImage: "bg-primary/10 font-bold border-primary"
                  }}
                />
              </CardContent>
            </Card>
            
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-medium mb-4">
                Images from {formattedDate}
              </h3>
              
              <ImageGrid 
                images={images || []} 
                isLoading={isImagesLoading}
                onImagePreview={handleImagePreview}
              />
              
              {images && images.length === 0 && !isImagesLoading && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500">No images found for this period</p>
                  <button 
                    className="mt-4 text-primary hover:underline"
                    onClick={handleOpenUploadModal}
                  >
                    Upload an image
                  </button>
                </div>
              )}
            </div>
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
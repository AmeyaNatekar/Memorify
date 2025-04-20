import { ImageWithShares } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Share2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ImageGridProps = {
  images: ImageWithShares[];
  isLoading: boolean;
  onImagePreview: (image: ImageWithShares) => void;
};

export default function ImageGrid({ images, isLoading, onImagePreview }: ImageGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="aspect-square">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No images to display</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {images.map((image) => (
        <ImageGridItem
          key={image.id}
          image={image}
          onPreview={() => onImagePreview(image)}
        />
      ))}
    </div>
  );
}

type ImageGridItemProps = {
  image: ImageWithShares;
  onPreview: () => void;
};

function ImageGridItem({ image, onPreview }: ImageGridItemProps) {
  const isShared = image.shares && (
    (image.shares.users && image.shares.users.length > 0) || 
    (image.shares.groups && image.shares.groups.length > 0)
  );

  const sharedGroup = image.shares?.groups?.[0];

  return (
    <div className="group relative">
      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
        <img
          src={image.path}
          alt={image.description || "Uploaded image"}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Overlay with options */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex space-x-2">
          <button 
            className="p-2 bg-white rounded-full hover:bg-gray-100"
            onClick={onPreview}
          >
            <Eye className="h-5 w-5 text-gray-800" />
          </button>
          <button className="p-2 bg-white rounded-full hover:bg-gray-100">
            <Share2 className="h-5 w-5 text-gray-800" />
          </button>
          <button className="p-2 bg-white rounded-full hover:bg-gray-100">
            <MoreHorizontal className="h-5 w-5 text-gray-800" />
          </button>
        </div>
      </div>
      
      {/* Shared badge */}
      {isShared && (
        <div className="absolute top-2 right-2">
          {sharedGroup ? (
            <Badge className="bg-green-500 hover:bg-green-600">{sharedGroup.name}</Badge>
          ) : (
            <Badge className="bg-primary">Shared</Badge>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type TimelineFilterProps = {
  dates: { year: number; month: number }[];
  isLoading: boolean;
  selectedDate: { year: number; month: number } | null;
  onSelect: (date: { year: number; month: number } | null) => void;
};

export default function TimelineFilter({
  dates,
  isLoading,
  selectedDate,
  onSelect,
}: TimelineFilterProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Format month and year
  const formatDate = (year: number, month: number) => {
    return new Date(year, month).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Get time period options for select dropdown
  const getTimePeriodOptions = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const options = [
      { label: 'All time', value: 'all' },
      { label: 'This month', value: `${currentYear}-${currentMonth}` },
      { label: 'This year', value: `${currentYear}` },
      // { label: 'Custom range', value: 'custom' },
    ];
    
    return options;
  };

  // Handle time period selection
  const handleTimePeriodChange = (value: string) => {
    if (value === 'all') {
      onSelect(null);
    } else if (value.includes('-')) {
      const [year, month] = value.split('-').map(Number);
      onSelect({ year, month });
    }
    // Additional logic for other options like 'This year' would go here
  };

  // Check if we need to show scroll arrows
  useEffect(() => {
    const checkScroll = () => {
      const scrollContainer = scrollRef.current;
      if (scrollContainer) {
        setShowLeftArrow(scrollContainer.scrollLeft > 0);
        setShowRightArrow(
          scrollContainer.scrollLeft < 
          scrollContainer.scrollWidth - scrollContainer.clientWidth
        );
      }
    };
    
    checkScroll();
    
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      return () => {
        scrollContainer.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [dates]);

  // Scroll left and right
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Timeline</h3>
        <div className="flex items-center">
          <Button variant="ghost" size="icon">
            <Calendar className="h-5 w-5 text-gray-600" />
          </Button>
          <Select 
            onValueChange={handleTimePeriodChange}
            defaultValue="all"
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              {getTimePeriodOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="relative">
        {showLeftArrow && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div 
          ref={scrollRef}
          className="overflow-x-auto hide-scrollbar pb-2 relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex space-x-2">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-24 rounded-full" />
              ))
            ) : dates.length > 0 ? (
              // Date buttons
              [
                <Button
                  key="all"
                  variant={selectedDate === null ? "default" : "outline"}
                  className="rounded-full whitespace-nowrap"
                  onClick={() => onSelect(null)}
                >
                  All Uploads
                </Button>,
                ...dates.map(({ year, month }) => (
                  <Button
                    key={`${year}-${month}`}
                    variant={
                      selectedDate?.year === year && selectedDate?.month === month
                        ? "default"
                        : "outline"
                    }
                    className="rounded-full whitespace-nowrap"
                    onClick={() => onSelect({ year, month })}
                  >
                    {formatDate(year, month)}
                  </Button>
                ))
              ]
            ) : (
              // No dates available
              <p className="text-gray-500">No uploads found</p>
            )}
          </div>
        </div>
        
        {showRightArrow && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md"
            onClick={scrollRight}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

/**
 * Interface para a categoria
 */
interface Category {
  id: number;
  name: string;
  slug: string;
  color?: string;
}

/**
 * Props do componente de filtro de categorias
 */
interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

/**
 * Componente de filtro de categorias
 * Exibe uma lista horizontal deslizável de categorias
 */
export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="py-4">
      <div className="max-w-4xl mx-auto">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex px-2 space-x-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(null)}
              className={cn(
                "rounded-full text-sm shadow-lg transform transition-all duration-300 hover:scale-105",
                selectedCategory === null 
                  ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white border-0"
                  : "text-gray-300 hover:text-white border-gray-800/50 hover:bg-black/40 bg-black/30 backdrop-blur-md"
              )}
            >
              Todos
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.slug ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectCategory(category.slug)}
                className={cn(
                  "rounded-full text-sm shadow-lg transform transition-all duration-300 hover:scale-105",
                  category.slug === "lgbt" && selectedCategory === category.slug 
                    ? "pride-gradient border-0" 
                    : selectedCategory === category.slug && category.slug !== "lgbt" 
                      ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white border-0" 
                      : "text-gray-300 hover:text-white border-gray-800/50 hover:bg-black/40 bg-black/30 backdrop-blur-md"
                )}
                style={(category.slug === "lgbt" && category.color === "pride" && selectedCategory === category.slug) 
                  ? { 
                      background: "linear-gradient(90deg, rgba(255,0,0,0.8) 0%, rgba(255,154,0,0.8) 17%, rgba(208,222,33,0.8) 33%, rgba(79,220,74,0.8) 50%, rgba(63,218,216,0.8) 66%, rgba(47,201,226,0.8) 83%, rgba(28,127,238,0.8) 100%)",
                      color: "#fff", 
                      textShadow: "0px 0px 2px rgba(0,0,0,0.6)",
                      borderColor: "transparent"
                    }
                  : (category.color && category.color !== "pride" && selectedCategory === category.slug)
                    ? { backgroundColor: category.color, color: "#fff", borderColor: "transparent" }
                    : {}
                }
              >
                {category.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
      </div>
    </div>
  );
}

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
    <div className="bg-black/60 py-1">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex p-2 space-x-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectCategory(null)}
            className={cn(
              "rounded-full",
              selectedCategory === null ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-300 hover:text-white border-blue-900/40 hover:bg-gray-900"
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
                "rounded-full",
                category.slug === "lgbt" && selectedCategory === category.slug ? "pride-gradient" : "",
                selectedCategory === category.slug && category.slug !== "lgbt" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-300 hover:text-white border-blue-900/40 hover:bg-gray-900"
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

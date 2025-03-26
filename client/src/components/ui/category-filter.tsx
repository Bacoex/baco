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
    <div className="bg-gray-50 border-t border-gray-200">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex p-4 space-x-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectCategory(null)}
            className={cn(
              "rounded-full",
              selectedCategory === null ? "bg-primary-100 text-primary-800 hover:bg-primary-200" : ""
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
                selectedCategory === category.slug ? "bg-primary-100 text-primary-800 hover:bg-primary-200" : ""
              )}
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

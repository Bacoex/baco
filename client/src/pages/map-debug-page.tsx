import MapDebug from "@/components/ui/map-debug";

export default function MapDebugPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Depuração do Mini Mapa</h1>
      <p className="mb-4">Esta página permite testar o funcionamento do mini mapa estático do Google Maps.</p>
      
      <MapDebug />
    </div>
  );
}
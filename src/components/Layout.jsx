import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Leaf } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/70 bg-sidebar lg:block">
        <Sidebar />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-r-border bg-sidebar p-0">
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" strokeWidth={2} />
            <span className="font-display text-base tracking-tight">Terra</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-8 lg:pt-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
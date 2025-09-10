import { Outlet } from "react-router";

export default function OffersLayout() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Offers Management</h1>
              <p className="text-muted-foreground">
                Track and manage job offers sent to candidates
              </p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Pending Offers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Offers sent but not yet responded to
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-orange-600">12</span>
                <span className="text-sm text-muted-foreground">Awaiting response</span>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Accepted Offers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Offers that have been accepted by candidates
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">8</span>
                <span className="text-sm text-muted-foreground">Accepted</span>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Declined Offers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Offers that have been declined
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-red-600">3</span>
                <span className="text-sm text-muted-foreground">Declined</span>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Expired Offers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Offers that have passed their expiration date
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-600">2</span>
                <span className="text-sm text-muted-foreground">Expired</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Offer Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sarah Johnson accepted offer for Senior Developer position</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New offer sent to Mark Davis for Product Manager role</p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Emma Wilson declined offer for UX Designer position</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

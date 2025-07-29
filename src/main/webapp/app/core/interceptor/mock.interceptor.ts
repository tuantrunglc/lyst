import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable()
export class MockInterceptor implements HttpInterceptor {
  
  // Mock users data
  private mockUsers = [
    {
      id: 1,
      phone: '0123456789',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      authorities: ['ROLE_ADMIN', 'ROLE_USER'],
      activated: true
    },
    {
      id: 2,
      phone: '0987654321',
      password: 'user123',
      firstName: 'Test',
      lastName: 'User',
      email: 'user@example.com',
      authorities: ['ROLE_USER'],
      activated: true
    }
  ];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { url, method, body } = req;

    // Only intercept requests to the mock API
    if (url.includes('lyst686.com/admin/api')) {
      return this.handleMockRequest(req);
    }

    // Pass through all other requests
    return next.handle(req);
  }

  private handleMockRequest(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    const { url, method, body } = req;

    // Login endpoint
    if (url.includes('/login') && method === 'POST') {
      return this.handleLogin(body);
    }

    // Logout endpoint
    if (url.includes('/logout') && method === 'POST') {
      return this.handleLogout();
    }

    // Account endpoint (both /account and /users)
    if ((url.includes('/account') || url.includes('/users')) && method === 'GET') {
      return this.handleGetAccount(req);
    }

    // Default: pass through
    return throwError(() => new Error('Mock endpoint not implemented'));
  }

  private handleLogin(credentials: any): Observable<HttpEvent<any>> {
    const { phone, password } = credentials;

    // Find user by phone and password
    const user = this.mockUsers.find(u => u.phone === phone && u.password === password);

    if (user) {
      // Successful login
      const token = this.generateMockToken(user);
      const response = new HttpResponse({
        status: 200,
        body: { token }
      });
      
      // Store user in localStorage for account endpoint
      localStorage.setItem('mockUser', JSON.stringify(user));
      
      return of(response).pipe(delay(500)); // Simulate network delay
    } else {
      // Failed login
      return throwError(() => ({
        status: 401,
        error: { message: 'Invalid phone number or password' }
      })).pipe(delay(500));
    }
  }

  private handleLogout(): Observable<HttpEvent<any>> {
    // Clear stored user and token
    localStorage.removeItem('mockUser');
    localStorage.removeItem('jhi-authenticationToken');
    sessionStorage.removeItem('jhi-authenticationToken');
    
    const response = new HttpResponse({
      status: 200,
      body: { message: 'Logged out successfully' }
    });
    
    return of(response).pipe(delay(300));
  }

  private handleGetAccount(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    // Check if user is authenticated (has token in localStorage)
    const token = localStorage.getItem('jhi-authenticationToken') || sessionStorage.getItem('jhi-authenticationToken');
    const storedUser = localStorage.getItem('mockUser');
    
    if (token && storedUser) {
      const user = JSON.parse(storedUser);
      const accountData = {
        id: user.id,
        login: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        authorities: user.authorities,
        activated: user.activated,
        langKey: 'en'
      };
      
      const response = new HttpResponse({
        status: 200,
        body: accountData
      });
      
      return of(response).pipe(delay(300));
    } else {
      // Not authenticated
      return throwError(() => ({
        status: 401,
        error: { message: 'Not authenticated' }
      }));
    }
  }

  private generateMockToken(user: any): string {
    // Generate a simple mock JWT token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: user.phone,
      userId: user.id,
      authorities: user.authorities,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    }));
    const signature = btoa('mock-signature');
    
    return `${header}.${payload}.${signature}`;
  }
}
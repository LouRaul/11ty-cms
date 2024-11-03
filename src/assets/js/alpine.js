import Alpine from 'alpinejs';

// Global Alpine store for cart functionality
Alpine.store('cart', {
    items: [],
    isOpen: false,
    
    init() {
        // Load cart from localStorage if available
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            this.items = JSON.parse(savedCart);
        }
    },
    
    get count() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    get total() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    addItem(product) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.isOpen = true;
    },
    
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
    },
    
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = parseInt(quantity);
            if (item.quantity <= 0) {
                this.removeItem(productId);
            }
        }
        this.saveCart();
    },
    
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    },
    
    clearCart() {
        this.items = [];
        this.saveCart();
    }
});

// Global store for navigation
Alpine.store('nav', {
    isOpen: false,
    
    toggle() {
        this.isOpen = !this.isOpen;
    },
    
    close() {
        this.isOpen = false;
    }
});

// Global store for search functionality
Alpine.store('search', {
    isOpen: false,
    query: '',
    results: [],
    loading: false,
    
    async search() {
        if (!this.query) {
            this.results = [];
            return;
        }
        
        this.loading = true;
        // Simulate search delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // This would be replaced with actual search logic
        this.results = [
            // Sample results
        ];
        
        this.loading = false;
    },
    
    reset() {
        this.query = '';
        this.results = [];
        this.isOpen = false;
    }
});

// Custom directive for handling click outside
Alpine.directive('click-outside', (el, { expression }, { evaluate }) => {
    const handler = (event) => {
        if (!el.contains(event.target)) {
            evaluate(expression);
        }
    };
    
    document.addEventListener('click', handler);
    
    return () => {
        document.removeEventListener('click', handler);
    };
});

// Custom directive for handling escape key
Alpine.directive('escape', (el, { expression }, { evaluate }) => {
    const handler = (event) => {
        if (event.key === 'Escape') {
            evaluate(expression);
        }
    };
    
    document.addEventListener('keydown', handler);
    
    return () => {
        document.removeEventListener('keydown', handler);
    };
});

// Initialize Alpine
window.Alpine = Alpine;
Alpine.start();
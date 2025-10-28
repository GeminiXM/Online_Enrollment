# Shopping Cart Sticky Implementation Guide

## Overview

This document explains how the shopping cart sticky positioning works in the Online Enrollment application. The cart moves smoothly as the page is scrolled and maintains proper positioning relative to the viewport while avoiding footer overlap.

## Key Implementation Details

### 1. **No CSS Sticky Positioning Used**

**CRITICAL**: The shopping cart does NOT use CSS `position: sticky`. This was intentionally removed because the enrollment layout interferes with sticky positioning due to:
- Complex flexbox layouts
- Parent container overflow settings
- Transform properties on parent elements
- Multiple nested containers with different positioning contexts

### 2. **JavaScript-Controlled Fixed Positioning**

The cart uses JavaScript to dynamically apply `position: fixed` with calculated coordinates:

```javascript
// Core positioning logic
cart.style.position = 'fixed';
cart.style.top = `${targetTopPx}px`;
cart.style.left = `${left}px`;
cart.style.width = `${fixedWidthPx}px`;
cart.style.zIndex = '10';
```

### 3. **Responsive Behavior**

#### Desktop (>900px width):
- Cart positioned on the right side of the form
- Uses fixed positioning with JavaScript calculations
- Sticks at 375px from top when scrolled
- Avoids footer overlap
- Width: 28% of layout width (minimum 250px)

#### Mobile (≤900px width):
- Cart moves inside the form (DOM reordering)
- Positioned above form actions
- Uses static positioning
- Full width within form container

## Code Architecture

### 1. **Mobile Layout Reordering** (`reorderElementsForMobile`)

```javascript
const reorderElementsForMobile = () => {
  const isMobile = window.innerWidth <= 900;
  
  if (isMobile) {
    // Move cart inside form, above actions
    form.insertBefore(cart, formActions);
  } else {
    // Restore cart to be sibling of form/actions
    parent.insertBefore(cart, originalCartNextSibling);
  }
};
```

**Purpose**: Dynamically reorders DOM elements for optimal mobile layout without CSS media queries.

### 2. **Desktop Fixed Positioning** (`applyFixed`)

```javascript
const applyFixed = (recalcWidth = false) => {
  // Calculate cart width (28% of layout, min 250px)
  fixedWidthPx = Math.max(250, Math.round(layout.clientWidth * 0.28));
  
  // Calculate left position
  const left = Math.round(lrect.right - fixedWidthPx);
  
  // Calculate natural position
  const naturalCartTopViewport = initialCartTop - window.scrollY;
  
  // Apply sticky behavior
  const stickyTopPx = 375;
  let targetTopPx = naturalCartTopViewport > stickyTopPx ? stickyTopPx : naturalCartTopViewport;
  
  // Avoid footer overlap
  const maxTopToAvoidFooter = footerRect.top - cart.offsetHeight - 8;
  targetTopPx = Math.min(targetTopPx, maxTopToAvoidFooter);
  
  // Apply positioning
  cart.style.position = 'fixed';
  cart.style.top = `${targetTopPx}px`;
  cart.style.left = `${left}px`;
  cart.style.width = `${fixedWidthPx}px`;
  cart.style.zIndex = '10';
};
```

**Purpose**: Handles all desktop positioning calculations and applies fixed positioning with sticky behavior.

### 3. **Event Listeners**

```javascript
// Resize handler - recalculates width and position
const onResize = () => applyFixed(true);

// Scroll handler - updates position on scroll
const onScroll = () => applyFixed(false);

window.addEventListener('resize', onResize);
window.addEventListener('scroll', onScroll, { passive: true });
```

**Purpose**: Ensures cart position updates on window resize and scroll events.

## CSS Configuration

### 1. **Base Cart Styles**

```css
.shopping-cart {
  position: static; /* Let JavaScript handle positioning */
  max-width: 28%;
  min-width: 250px;
  align-self: flex-start;
  margin: 0;
  /* JavaScript handles all positioning */
}
```

### 2. **Desktop Layout**

```css
@media (min-width: 769px) {
  .enrollment-layout {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    position: relative;
  }
  
  .shopping-cart {
    position: static; /* Let JavaScript handle positioning */
    order: 2;
    max-width: 28%;
    min-width: 250px;
    align-self: flex-start;
  }
}
```

### 3. **Mobile Layout**

```css
@media (max-width: 768px) {
  .shopping-cart {
    position: static !important;
    order: 2 !important;
    margin: 1rem 0 !important;
    max-width: 100% !important;
    width: 100% !important;
  }
}
```

## Key Configuration Values

- **Sticky Top Position**: 375px from viewport top
- **Cart Width**: 28% of layout width (minimum 250px)
- **Breakpoint**: 900px (mobile vs desktop)
- **Z-Index**: 10 (ensures cart stays above other elements)
- **Footer Buffer**: 8px gap to avoid overlap

## What NOT to Do

### ❌ **DO NOT Use CSS Sticky**

```css
/* DON'T DO THIS */
.shopping-cart {
  position: sticky;
  top: 20px;
}
```

**Why**: The enrollment layout's complex flexbox structure and parent containers interfere with sticky positioning.

### ❌ **DO NOT Add Overflow Hidden to Parent Containers**

```css
/* DON'T DO THIS */
.enrollment-layout {
  overflow: hidden;
}
```

**Why**: This breaks the fixed positioning calculations and prevents proper cart movement.

### ❌ **DO NOT Use Transform on Parent Elements**

```css
/* DON'T DO THIS */
.enrollment-layout {
  transform: translateZ(0);
}
```

**Why**: Transform creates a new stacking context that interferes with fixed positioning.

### ❌ **DO NOT Mix CSS Positioning with JavaScript**

```css
/* DON'T DO THIS */
.shopping-cart {
  position: fixed;
  top: 20px;
  right: 20px;
}
```

**Why**: This creates conflicts with the JavaScript positioning logic and can cause layout issues.

## How to Recreate from Scratch

### 1. **Set Up Base CSS**

```css
.shopping-cart {
  position: static; /* Let JavaScript handle positioning */
  max-width: 28%;
  min-width: 250px;
  align-self: flex-start;
  margin: 0;
}

.enrollment-layout {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  position: relative;
}
```

### 2. **Implement Mobile Reordering**

```javascript
const reorderElementsForMobile = () => {
  const isMobile = window.innerWidth <= 900;
  const cart = document.querySelector('.shopping-cart');
  const form = document.querySelector('.enrollment-form');
  const formActions = document.querySelector('.form-actions');
  
  if (isMobile) {
    // Move cart inside form
    form.insertBefore(cart, formActions);
  } else {
    // Restore cart to original position
    // Implementation depends on your layout structure
  }
};
```

### 3. **Implement Desktop Fixed Positioning**

```javascript
const applyFixed = () => {
  const cart = document.querySelector('.shopping-cart');
  const layout = document.querySelector('.enrollment-layout');
  
  // Calculate dimensions
  const fixedWidthPx = Math.max(250, Math.round(layout.clientWidth * 0.28));
  const left = Math.round(layout.getBoundingClientRect().right - fixedWidthPx);
  
  // Calculate sticky position
  const stickyTopPx = 375;
  const naturalTop = /* calculate natural position */;
  const targetTop = naturalTop > stickyTopPx ? stickyTopPx : naturalTop;
  
  // Apply positioning
  cart.style.position = 'fixed';
  cart.style.top = `${targetTop}px`;
  cart.style.left = `${left}px`;
  cart.style.width = `${fixedWidthPx}px`;
  cart.style.zIndex = '10';
};
```

### 4. **Add Event Listeners**

```javascript
useEffect(() => {
  // Initial positioning
  reorderElementsForMobile();
  applyFixed();
  
  // Event listeners
  const handleResize = () => {
    reorderElementsForMobile();
    applyFixed(true);
  };
  
  const handleScroll = () => applyFixed(false);
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll);
  };
}, []);
```

## Troubleshooting

### Cart Not Moving on Scroll
- Check that `position: static` is set in CSS
- Verify JavaScript event listeners are attached
- Ensure no CSS `overflow: hidden` on parent containers

### Cart Overlapping Footer
- Implement footer detection and clamping logic
- Add buffer space (8px recommended)

### Mobile Layout Issues
- Verify DOM reordering is working correctly
- Check that cart is moved inside form on mobile
- Ensure proper order values in CSS

### Performance Issues
- Use `{ passive: true }` for scroll listeners
- Debounce resize events if needed
- Avoid recalculating on every scroll if not necessary

## Dependencies

- React (for useEffect and useRef)
- DOM querySelector methods
- getBoundingClientRect() for position calculations
- Window scroll and resize events

This implementation provides a robust, cross-browser compatible sticky cart that works reliably across different screen sizes and layout configurations.

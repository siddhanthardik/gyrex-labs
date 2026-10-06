"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string; // labTestId or packageId
  itemType: "TEST" | "PACKAGE";
  name: string;
  code?: string | null;
  price: number;
  sampleType?: string;
  fastingRequired?: boolean;
  homeCollectionAvailable?: boolean;
}

interface CartContextType {
  labSlug: string;
  items: CartItem[];
  collectionType: "HOME_COLLECTION" | "LAB_VISIT";
  setCollectionType: (type: "HOME_COLLECTION" | "LAB_VISIT") => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  isHydrated: boolean;
  hasLabVisitOnlyItems: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  labSlug,
  children,
}: {
  labSlug: string;
  children: React.ReactNode;
}) {
  // Deterministic server-safe initial state
  const [items, setItems] = useState<CartItem[]>([]);
  const [collectionType, setCollectionType] = useState<"HOME_COLLECTION" | "LAB_VISIT">("HOME_COLLECTION");
  const [isHydrated, setIsHydrated] = useState(false);

  const hasLabVisitOnlyItems = items.some((i) => i.homeCollectionAvailable === false);

  // If any item requires lab visit, force collectionType to LAB_VISIT
  useEffect(() => {
    if (hasLabVisitOnlyItems && collectionType === "HOME_COLLECTION") {
      setCollectionType("LAB_VISIT");
    }
  }, [hasLabVisitOnlyItems, collectionType]);

  // Read persisted cart data inside useEffect after the component mounts
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`gyrex_cart_${labSlug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
          const containsIneligible = parsed.items.some((i: any) => i.homeCollectionAvailable === false);
          if (containsIneligible) {
            setCollectionType("LAB_VISIT");
          } else if (parsed.collectionType === "HOME_COLLECTION" || parsed.collectionType === "LAB_VISIT") {
            setCollectionType(parsed.collectionType);
          }
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, [labSlug]);

  // Sync cart to sessionStorage strictly after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      sessionStorage.setItem(
        `gyrex_cart_${labSlug}`,
        JSON.stringify({ items, collectionType })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [items, collectionType, labSlug, isHydrated]);

  const safeSetCollectionType = (type: "HOME_COLLECTION" | "LAB_VISIT") => {
    if (type === "HOME_COLLECTION" && hasLabVisitOnlyItems) {
      setCollectionType("LAB_VISIT");
      return;
    }
    setCollectionType(type);
  };

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      // Prevent duplicates
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    try {
      sessionStorage.removeItem(`gyrex_cart_${labSlug}`);
    } catch {
      // Ignore
    }
  };

  const subtotal = items.reduce((acc, item) => acc + item.price, 0);

  return (
    <CartContext.Provider
      value={{
        labSlug,
        items,
        collectionType,
        setCollectionType: safeSetCollectionType,
        addItem,
        removeItem,
        clearCart,
        subtotal,
        itemCount: items.length,
        isHydrated,
        hasLabVisitOnlyItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

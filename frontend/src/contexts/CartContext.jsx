import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const KEY_CART = "swm_cart";
const KEY_TABLE = "swm_table";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY_CART) || "[]");
    } catch {
      return [];
    }
  });
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem(KEY_TABLE) || "");

  useEffect(() => {
    localStorage.setItem(KEY_CART, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (tableNumber) localStorage.setItem(KEY_TABLE, tableNumber);
  }, [tableNumber]);

  const addItem = (product, qty = 1, note = "") => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id && i.note === note);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id && i.note === note ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty,
          note,
        },
      ];
    });
  };

  const updateQty = (productId, note, qty) => {
    if (qty <= 0) return removeItem(productId, note);
    setItems((prev) => prev.map((i) => (i.product_id === productId && i.note === note ? { ...i, qty } : i)));
  };

  const removeItem = (productId, note) =>
    setItems((prev) => prev.filter((i) => !(i.product_id === productId && i.note === note)));

  const updateNote = (productId, oldNote, newNote) =>
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId && i.note === oldNote ? { ...i, note: newNote } : i))
    );

  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const taxRate = 0.1;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        tableNumber,
        setTableNumber,
        addItem,
        updateQty,
        removeItem,
        updateNote,
        clear,
        subtotal,
        tax,
        total,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

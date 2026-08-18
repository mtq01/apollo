// declare type interface
// https://www.typescriptlang.org/docs/handbook/2/objects.html
// interface types for components are best left in the component file. from what i read its just easier to understand/follow this way.
interface EmptyStateProps {
  message: string;
  title?: string;
}

// create function to display empty state
// this is what the user sees before they have searched for any product data or added any previous orders.

function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="w-full">
      {title && <p className="text-xl italic font-semibold">{title}</p>}
      <p className="mt-2 italic text-md">{message}</p>
    </div>
  );
}
export default EmptyState;

// https://nextjs.org/learn/react-foundations/displaying-data-with-props

import React from 'react';
import {
  useSortable,
  defaultDropAnimation,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  Flex,
  Text,
  useColorModeValue,
  Center,
} from '@chakra-ui/react';
import { FiGripVertical, FiTrash2 } from 'react-icons/fi';
import { usePPTStore } from '@/stores/pptStore';

interface SlideCardProps {
  slide: {
    id: string;
    displayIndex: number;
    meta: {
      summary: string;
      displayIndex: number;
      createdAt: string;
      updatedAt: string;
    };
  };
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  slide,
  onClick,
  onDelete,
  isSelected = false
}) => {
  const store = usePPTStore();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete?.(slide.id);
      setIsDeleting(false);
    }, 200);
  };

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const selectedBg = isSelected ? 'blue.50' : bg;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      bg={selectedBg}
      borderColor={isSelected ? 'blue.400' : borderColor}
      borderWidth={isSelected ? 2 : 1}
      _hover={{ bg: hoverBg }}
      transition="all 0.2s"
      _active={{ shadow: 'md' }}
    >
      <CardContent p={3}>
        <Flex alignItems="center" justifyContent="space-between">
          <Flex alignItems="center" flex={1} mr={2}>
            <div {...attributes} {...listeners} className="drag-handle">
              <FiGripVertical
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <Flex flex={1} ml={2}>
              <Text
                fontSize="sm"
                fontWeight={isSelected ? '600' : '400'}
                color={isSelected ? 'blue.600' : 'gray.700'}
                cursor="pointer"
                onClick={() => onClick?.(slide.id)}
                _hover={{ color: 'blue.500' }}
              >
                {slide.meta.summary || `幻灯片 ${slide.displayIndex + 1}`}
              </Text>
            </Flex>
          </Flex>
          <Center>
            <FiTrash2
              color="red.500"
              cursor="pointer"
              onClick={handleDelete}
              opacity={isDeleting ? 0.5 : 1}
              transition="opacity 0.2s"
              _hover={{ opacity: 1 }}
              style={{ fontSize: '1.1rem' }}
            />
          </Center>
        </Flex>
      </CardContent>
    </Card>
  );
};
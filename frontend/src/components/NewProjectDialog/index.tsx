import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  FormControl,
  FormLabel,
  useDisclosure,
  useToast,
  Box,
  Flex,
} from '@chakra-ui/react';
import { FiPlus, FiFolderOpen, FiSave } from 'react-icons/fi';
import { usePPTStore } from '@/stores/pptStore';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectPath: string) => void;
}

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { onOpen, onClose: onCloseDialog } = useDisclosure();
  const toast = useToast();
  const { createNewProject } = usePPTStore();

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast({
        title: '项目名称不能为空',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // 创建新项目
      createNewProject();

      // 模拟创建项目（实际应该调用后端 API）
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: '项目创建成功',
        description: `项目 "${projectName}" 已创建`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // 通知父组件项目已创建
      onProjectCreated?.(projectName);

      // 重置表单
      setProjectName('');
      setLocation('');
      onClose();
    } catch (error) {
      toast({
        title: '创建项目失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <FiPlus fontSize="1.5rem" color="blue.500" />
            <Text fontSize="1.25rem" fontWeight="bold">创建新项目</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* 项目名称 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600" color="gray.700">
                项目名称 *
              </FormLabel>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入项目名称..."
                fontSize="md"
                borderRadius="md"
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
                }}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                项目名称将用作文件夹名称
              </Text>
            </FormControl>

            {/* 项目位置 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600" color="gray.700">
                项目位置
              </FormLabel>
              <HStack spacing={2}>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="留空使用默认位置"
                  fontSize="md"
                  borderRadius="md"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
                  }}
                />
                <Button
                  leftIcon={<FiFolderOpen />}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: 实现文件夹选择对话框
                    toast({
                      title: '文件夹选择',
                      description: '文件夹选择功能待实现',
                      status: 'info',
                      duration: 2000,
                    });
                  }}
                >
                  浏览
                </Button>
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                留空则保存在默认工作空间
              </Text>
            </FormControl>

            {/* 创建说明 */}
            <Box
              bg="blue.50"
              borderLeft="4px"
              borderColor="blue.500"
              p={3}
              borderRadius="md"
            >
              <Text fontSize="sm" color="blue.800">
                <strong>提示：</strong>创建新项目将清空当前编辑内容。您可以在创建前保存当前项目。
              </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3} width="100%" justify="flex-end">
            <Button
              variant="outline"
              onClick={onClose}
              isLoading={isLoading}
              _hover={{
                bg: 'gray.100',
              }}
            >
              取消
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<FiSave />}
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="创建中..."
              bg="blue.600"
              _hover={{
                bg: 'blue.700',
              }}
            >
              创建项目
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
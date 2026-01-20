import React, { useState } from 'react';
import { Menu, MenuButton, MenuList, MenuItem, MenuDivider, Flex, Box, Text } from '@chakra-ui/react';
import { FiFile, FiSettings, FiPlus, FiFolder, FiSave, FiX, FiCircle } from 'react-icons/fi';

interface MenuBarProps {
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onExit?: () => void;
  onWorkspacePath?: () => void;
  onAutoBackup?: () => void;
  isDirty?: boolean;
  shortcuts?: {
    new: string;
    open: string;
    save: string;
  };
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExit,
  onWorkspacePath,
  onAutoBackup,
  isDirty = false,
  shortcuts = { new: 'Ctrl+N', open: 'Ctrl+O', save: 'Ctrl+S' }
}) => {
  const [showDirtyIndicator, setShowDirtyIndicator] = useState(isDirty);

  React.useEffect(() => {
    setShowDirtyIndicator(isDirty);
  }, [isDirty]);

  return (
    <Flex
      bg="gray.900"
      color="white"
      p={2}
      alignItems="center"
      borderBottom="1px solid"
      borderColor="gray.700"
      h="50px"
      userSelect="none"
    >
      {/* 文件菜单 */}
      <Box mr={6}>
        <Menu>
          <MenuButton as={FiFile} fontSize="1.2rem" cursor="pointer" _hover={{ color: 'white' }} />
          <MenuList bg="gray.800" borderColor="gray.700" color="white" minW="200px">
            <MenuItem
              onClick={onNewProject}
              icon={<FiPlus />}
              _hover={{ bg: "gray.700" }}
            >
              新建项目 {shortcuts.new && <span style={{ opacity: 0.7 }}>({shortcuts.new})</span>}
            </MenuItem>
            <MenuItem
              onClick={onOpenProject}
              icon={<FiFolder />}
              _hover={{ bg: "gray.700" }}
            >
              打开项目 {shortcuts.open && <span style={{ opacity: 0.7 }}>({shortcuts.open})</span>}
            </MenuItem>
            <MenuItem
              onClick={onSaveProject}
              icon={<FiSave />}
              _hover={{ bg: "gray.700" }}
            >
              保存 {shortcuts.save && <span style={{ opacity: 0.7 }}>({shortcuts.save})</span>}
              {showDirtyIndicator && (
                <FiCircle
                  color="red.500"
                  ml={2}
                  style={{ fontSize: '0.8rem' }}
                />
              )}
            </MenuItem>
            <MenuDivider />
            <MenuItem
              onClick={onExit}
              icon={<FiX />}
              _hover={{ bg: "gray.700" }}
            >
              退出
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>

      {/* 设置菜单 */}
      <Box>
        <Menu>
          <MenuButton as={FiSettings} fontSize="1.2rem" cursor="pointer" _hover={{ color: 'white' }} />
          <MenuList bg="gray.800" borderColor="gray.700" color="white" minW="200px">
            <MenuItem
              onClick={onWorkspacePath}
              _hover={{ bg: "gray.700" }}
            >
              Workspace 路径
            </MenuItem>
            <MenuItem
              onClick={onAutoBackup}
              _hover={{ bg: "gray.700" }}
            >
              自动备份间隔
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </Flex>
  );
};
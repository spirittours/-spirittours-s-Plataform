import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Tooltip
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../i18n/i18n.config';

/**
 * Language Selector Component
 * 
 * Displays a language picker that allows users to switch between
 * supported languages. Automatically handles RTL languages and
 * persists the selection to localStorage.
 * 
 * Features:
 * - Dropdown menu with all supported languages
 * - Native language names for better UX
 * - RTL support for Hebrew and Arabic
 * - Checkmark for current language
 * - Persists selection to localStorage
 * - Updates document direction automatically
 * 
 * @example
 * ```tsx
 * <LanguageSelector />
 * ```
 */
const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      // Change language
      await i18n.changeLanguage(languageCode);
      
      // Persist to localStorage
      localStorage.setItem('i18nextLng', languageCode);
      
      // Update document direction
      const direction = supportedLanguages[languageCode as keyof typeof supportedLanguages].dir;
      document.documentElement.dir = direction;
      document.documentElement.lang = languageCode;
      
      // Close menu
      handleClose();
      
      // Optional: Reload page to apply RTL styles fully
      // window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const currentLanguage = supportedLanguages[i18n.language as keyof typeof supportedLanguages] 
    || supportedLanguages.en;

  return (
    <Box>
      <Tooltip title={t('common.change_language', 'Change Language')}>
        <IconButton
          onClick={handleClick}
          size="large"
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          aria-label="select language"
          color="inherit"
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 200,
            mt: 1.5,
          },
        }}
      >
        <MenuItem disabled>
          <ListItemText>
            <Typography variant="body2" color="text.secondary">
              {t('common.select_language', 'Select Language')}
            </Typography>
          </ListItemText>
        </MenuItem>
        
        {Object.entries(supportedLanguages).map(([code, language]) => {
          const isSelected = i18n.language === code;
          
          return (
            <MenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              selected={isSelected}
              sx={{
                direction: language.dir,
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                },
              }}
            >
              {isSelected && (
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
              )}
              <ListItemText
                inset={!isSelected}
                primary={language.nativeName}
                secondary={language.name}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;

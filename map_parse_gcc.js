var fs = require("fs");
var sprintf = require('sprintf-js').sprintf;

var arguments = process.argv.splice(2);

var usage = function () {
	console.error("Usage node map_parse_gcc.js [-a] [-w] <map file filename>");
	console.error("           -a = show all sections");
	console.error("           -w = show more warnings");
	console.error("           -W = write to file");
	process.exit(1);
};

var get_target_name = function (name) {
	let target_name;
	if (/^(.*)\.map/.test(name)) {
		target_name = name.replace(/^.*[\/\\](.*)\.map/, "$1");
	}
	return target_name;
};

var process_section = function (area, section, size, modulefn, decaddress, hexaddress) {
	let module = "Other";

	if ((section == "rodata.wifi_firmware_image_data") ||
		(section == "rodata.wifi_firmware_image_size")) {
		module = "Wi-Fi Firmware";
	} else if (section.match(/^rodata.resources/i)) {
		module = "resources";
	} else if (modulefn.match(/\/App_\S+\.a/i)) {
		module = "App";
	} else if (modulefn.match(/platform_vector_table/i) ||
		modulefn.match(/\/platform_isr\.o/i) ||
		modulefn.match(/\/platform_unhandler_isr\.o/i) ||
		modulefn.match(/\/hardfault_handler\.o/i)) {
		module = "Interrupt Vectors";
	} else if (modulefn.match(/\/ThreadX\.a/i) ||
		modulefn.match(/\/ThreadX-\d.\d.\w+\.a/i)) {
		module = "ThreadX";
	} else if (modulefn.match(/\/SPI_Flash_Library/i)) {
		module = "SPI Flash Library";
	} else if (modulefn.match(/\/STM32F1xx_lib\.a/i) ||
		modulefn.match(/\/STM32F1xx_Drv\.a/i) ||
		modulefn.match(/\/STM32F2xx\.a/i) ||
		modulefn.match(/\/STM32F2xx_Peripheral_Drivers\.a/i) ||
		modulefn.match(/\/STM32F2xx_StdPeriph_Libraries\.a/i) ||
		modulefn.match(/\/STM32F2xx_Peripheral_Libraries\.a/i) ||
		modulefn.match(/\/STM32F4xx\.a/i) ||
		modulefn.match(/\/STM32F4xx_Peripheral_Drivers\.a/i) ||
		modulefn.match(/\/STM32F4xx_StdPeriph_Libraries\.a/i) ||
		modulefn.match(/\/STM32F4xx_Peripheral_Libraries\.a/i) ||
		modulefn.match(/\/BCM439x\.a/i) ||
		modulefn.match(/\/BCM439x_Peripheral_Drivers\.a/i) ||
		modulefn.match(/\/BCM4390A1_ROM\.a/i) ||
		modulefn.match(/\/ASF\.a/i) ||
		modulefn.match(/\/SAM4S\.a/i) ||
		modulefn.match(/\/K60_?D?r?v?\.a/i) ||
		modulefn.match(/\/LPC17xx\.a/i) ||
		modulefn.match(/\/LPC17xx_Peripheral_Drivers\.a/i) ||
		modulefn.match(/\/LPC17xx_StdPeriph_Libraries\.a/i)) {
		module = "Host MCU-family library";
	} else if (section.match(/\.app_thread_stack/i)) {
		module = "App Stack";
	} else if (modulefn.match(/arm-none-eabi/i) ||
		modulefn.match(/[\\\/]libc\.a/i) ||
		modulefn.match(/[\\\/]libgcc\.a/i) ||
		modulefn.match(/[\\\/]libm\.a/i) ||
		modulefn.match(/[\\\/]common_GCC\.a/i) ||
		modulefn.match(/\/common\/GCC\/\S+\.o/i) ||
		modulefn.match(/\/platform\/GCC\/\S+\.o/i)) {
		module = "libc";
	} else if (modulefn.match(/\/WICED\.a/i) ||
		modulefn.match(/\/Wiced_(ThreadX|FreeRTOS)_Interface\.a/i) ||
		modulefn.match(/\/Wiced_\w+\_Interface_\w+\.a/i) ||
		modulefn.match(/\/Wiced_Network_\w+_\w+\.a/i)) {
		module = "WICED";
	} else if (modulefn.match(/\w+_Interface_(SPI|SDIO)\.a/i) ||
		modulefn.match(/\/WWD_for_(SPI|SDIO|SoC_4390)_\w+\.a/i) ||
		modulefn.match(/\/WWD_\w+\_Interface\.a/i) ||
		modulefn.match(/\/WWD_\w+\_Interface_\w+\.a/i)) {
		module = "WWD";
	} else if (modulefn.match(/\/crt0_gcc\.o/i) ||
		modulefn.match(/\/Platform_\S+\.a/i)) {
		module = "platform";
	// } else if (modulefn.match(/\/Lib_(.+)\.a/i)) {
	} else if (/\/Lib_(.+)\.a/i.test(modulefn)) {
		module = modulefn.match(/\/Lib_(.+)\.a/i)[1];
	// } else if (modulefn.match(/\/libraries\/.+\/([^.]+)\.[^\/]*\.a/i)) {
	} else if (/\/libraries\/.+\/([^.]+)\.[^\/]*\.a/i.test(modulefn)) {
		module = modulefn.match(/\/libraries\/.+\/([^.]+)\.[^\/]*\.a/i)[1];
	} else if (modulefn.match(/\/resources\.a/i)) {
		module = "resources";
	} else if (modulefn.match(/\/Supplicant_uSSL\.a/i) ||
		modulefn.match(/\/Supplicant_uSSL.\w+\.a/i) ||
		modulefn.match(/\/uSSL\.\w+\.\w+\.\w+\.\w+\.a/i)) {
		module = "Supplicant - SSL/TLS";
	} else if (modulefn.match(/\/Supplicant_besl\.a/i) ||
		modulefn.match(/\/Supplicant_besl.\w+\.a/i) ||
		modulefn.match(/\/BESL\.\w+\.\w+\.a/i)) {
		module = "Supplicant - BESL";
	} else if ((section == "rodata.vars") ||
		(section == "rodata.wifi_nvram_image")) {
		module = "NVRam";
	} else if (section == "fill") {
		module = "Startup Stack & Link Script fill";
	} else if ((section.match(/.*tx_buffer_pool_memory/)) ||
		(section.match(/.*rx_buffer_pool_memory/)) ||
		(section.match(/.*buffer_pool_memory_common/)) ||
		(section.match(/.*buffer_pool_memory_128/)) ||
		(section.match(/.*memp_memory/))) {
		module = "Packet Buffers";
	} else if (section.match(/.*xHeap/)) {
		module = "FreeRTOS heap (inc Stacks & Semaphores)";
	} else if (section.match(/.*xHeap/)) {
		module = "FreeRTOS heap (inc Stacks & Semaphores)";
	} else if (section.match(/.*lwip_stats/)) {
		module = "LwIP stats";
	} else if (section.match(/.*ram_heap/)) {
		module = "LwIP Heap";
	} else if (modulefn.match(/.*app_header\.o/i)) {
		module = "Bootloader";
	} else if (modulefn.match(/\/Gedday\.\w+\.\w+\.\w+\.\w+\.a/i)) {
		module = "Gedday";
	} else if (modulefn.match(/\/NetX\.a/i) ||
		modulefn.match(/\/NetX.\w+\.a/i)) {
		module = "NetX";
	} else if (modulefn.match(/\/NetX_Duo\.a/i) ||
		modulefn.match(/\/NetX_Duo-\d.\d.\w+\.a/i)) {
		module = "NetX-Duo - Code";
	} else if ((network == "NetX_Duo") && (section.match(/\.wiced_ip_handle/i))) {
		module = "NetX-Duo - Interfaces & Stacks";
	} else if (section.match(/RAM Initialisation/i)) {
		module = "RAM Initialisation";
	} else if (modulefn.match(/\/LwIP\.a/i)) {
		module = "LwIP";
	} else if (modulefn.match(/\/FreeRTOS\.a/i)) {
		module = "FreeRTOS";
	} else if (modulefn.match(/NoOS\.a/i)) {
		module = "NoOS";
	} else if (modulefn.match(/\/Wiced_(NetX|NetX_Duo|LwIP)_Interface\.a/i)) {
		module = "Networking";
	} else if (modulefn.match(/\/resources\.a/i)) {
		module = "Resources";
	} else if (modulefn.match(/\/Nfc\.a/i)) {
		module = "NFC";
	}
	else {
		console.error("++" + area + ',' + module + ',' + section + ',' + size + ',' + "0x" + hexaddress + ',' + decaddress);
	}

	if (printall) {
		console.log(area + ',' + module + ',' + section + ',' + size + ',' + "0x" + hexaddress + ',' + decaddress + ',' + modulefn);
	}

	if (undefined == module_totals[module]) {
		module_totals[module] = [];
	}
	if (undefined == module_totals[module][area]) {
		module_totals[module][area] = 0;
	}
	module_totals[module][area] += size;

	return module;
};

var print_module_totals = function (argument) {
	let keys = function (obj) {
		let keys = [];
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				keys.push(key);
			}
		}
		return keys;
	};
	let modules = keys(module_totals).sort(function (a, b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	if (false == all_ram) {
		if (printall) {
			console.log("----------------------------------,--------,---------");
			console.log("                                  ,        ,  Static ");
			console.log("Module                            , Flash  ,   RAM   ");
			console.log("----------------------------------,--------,---------");
			modules.forEach(function (module, index, array) {
				console.log(sprintf("%-34.34s, %7d, %7d", module, module_totals[module]['FLASH'] || 0, module_totals[module]['RAM'] || 0));
			})
			// for (let module in module_totals) {
			// 	console.log(sprintf("%-34.34s, %7d, %7d", module, module_totals[module]['FLASH'] || 0, module_totals[module]['RAM'] || 0));
			// }
			console.log("----------------------------------,--------,---------");
			console.log(sprintf("TOTAL (bytes)                     , %7d, %7d", total_flash, total_ram));
			console.log("----------------------------------,--------,---------");
		} else {
			console.log("----------------------------------|---------|---------|");
			console.log("                                  |         |  Static |");
			console.log("              Module              |  Flash  |   RAM   |");
			console.log("----------------------------------+---------+---------|");
			modules.forEach(function (module, index, array) {
				console.log(sprintf("%-34.34s| %7d | %7d |", module, module_totals[module]['FLASH'] || 0, module_totals[module]['RAM'] || 0));
			})
			// for (let module in module_totals) {
			// 	console.log(sprintf("%-34.34s| %7d | %7d |", module, module_totals[module]['FLASH'] || 0, module_totals[module]['RAM'] || 0));
			// }
			console.log("----------------------------------+---------+---------|");
			console.log(sprintf("TOTAL (bytes)                     | %7d | %7d |", total_flash, total_ram));
			console.log("----------------------------------|---------|---------|");
		}
	} else {
		if (printall) {
			console.log("----------------------------------,---------");
			console.log("                                  ,  Static ");
			console.log("Module                            ,   RAM   ");
			console.log("----------------------------------,---------");
			for (let module in module_totals) {
				console.log(sprintf("%-34.34s, %7d", module_totals[module]['RAM'] || 0));
			}
			console.log(sprintf("TOTAL (bytes)                     , %7d", total_ram));
			console.log("----------------------------------,---------");
		} else {
			console.log("----------------------------------|---------|");
			console.log("                                  |  Static |");
			console.log("              Module              |   RAM   |");
			console.log("----------------------------------+---------|");
			modules.forEach(function (module, index, array) {
				console.log(sprintf("%-34.34s| %7d |", module, module_totals[module]['RAM'] || 0));
			})
			// for (let module in module_totals) {
			// 	console.log(sprintf("%-34.34s| %7d |", module, module_totals[module]['RAM'] || 0));
			// }
			console.log("----------------------------------+---------|");
			console.log(sprintf("TOTAL (bytes)                     | %7d |", total_ram));
			console.log("----------------------------------|---------|");
		}
	}
	if (total_other != 0) {
		console.log("WARNING: " + total_other + " bytes unaccounted for (neither FLASH or RAM)");
	}
	console.log();
};

if (0 == arguments.length) {
	usage();
}

// command line parameters
var filename,
	write_to_file = false,
	printall = false,
	warn = false;

arguments.forEach(function (value, index, array) {
	if ('-a' === value) {
		printall = true;
	} else if ('-w' === value) {
		warn = true;
	} else if ('-W' === value) {
		write_to_file = true;
	} else {
		filename = value;
	}
});

if ("string" != typeof filename) {
	usage();
}

// open the file
var file = fs.readFileSync(filename, 'utf8');

// Get the start of FLASH and ram
var content = file.match(/[\s\S]*Memory Configuration[\s\S]*Attributes([\s\S]*)Linker script and memory map[\s\S]*/);

if (null == content) {
	console.error("Invalid Map file.");
	process.exit(2);
}
if (2 == content.length) {
	file = content[0];
}

(function() {
	var originalLog = console.log,
		out = fs.createWriteStream(filename + ".csv");

	console.log = function (str) {
		if (write_to_file) {
			out.write(str || "");
			out.write("\n");
		} else {
			originalLog(str || "");
		}
	}
})();

var flash_section_name = [],
	flash_section_start = [],
	flash_section_length = [],
	ram_section_name = [],
	ram_section_start = [],
	ram_section_length = [],
	all_ram = true,
	mem_config = content[1],
	network = "Unknown";

// Capture all flash sections (look for xr attribute, without w, to signify flash)
var reg = /(\S*)\s+0x(\S*)\s+0x(\S*)\s+xr[^w]/gi;
while (content = reg.exec(mem_config)) {
	flash_section_name.push(content[1]);
	flash_section_start.push(parseInt(content[2], 16));
	flash_section_length.push(parseInt(content[3], 16));
	all_ram = false;
}

// Capture all ram sections (look for xrw attribute to signify ram)
reg = /(\S*)\s+0x(\S*)\s+0x(\S*)\s+xrw/gi;
while (content = reg.exec(mem_config)) {
	ram_section_name.push(content[1]);
	ram_section_start.push(parseInt(content[2], 16));
	ram_section_length.push(parseInt(content[3], 16));
}

// remove stuff above the memory map
file = file.replace(/[\s\S]*Linker script and memory map([\s\S]*)/, "$1");

// remove stuff below the memory map
file = file.replace(/([\s\S]*)Cross Reference Table[\s\S]*/, "$1");
// fs.writeFileSync(get_target_name(filename) + ".dump", file);
// fs.writeFileSync(filename + ".dump", file);

var total_flash = 0,
	total_ram = 0,
	total_other = 0,
	max_flash = 0,
	max_ram = 0,
	max_other = 0,
	module_totals = [];

if (printall) {
	console.log("Memory Area, Module, Name, Size, Address, Decimal Address, Filename, See bottom for collated totals");
}

reg = /\n [\.\*]?(\S+?)\*?\s+0x(\S+)\s+0x(\S+)/gi;
var last_pos = 0;
while (content = reg.exec(file)) {
	let pos,
		area,
		modulefn = "",
		section = content[1],
		hexaddress = content[2],
		decaddress = parseInt(content[2], 16),
		size = parseInt(content[3], 16);

	if ("fill" != section) {
		pos = content['index'] + content[0].length;
		let obj = file.substr(pos).match(/\s+(\S+)/i);
		if (obj) {
			modulefn = obj[0];
		}
		last_pos = pos;
	} else {
		let obj = file.substr(last_pos).match(/\s+(\S+)/i);
		if (obj) {
			modulefn = obj[0];
		}
	}

	if ( ( section    != "debug_info"      ) &&
		 ( section    != "debug_macinfo"   ) &&
		 ( section    != "debug_str"       ) &&
		 ( section    != "debug_line"      ) &&
		 ( section    != "debug_loc"       ) &&
		 ( section    != "debug_frame"     ) &&
		 ( section    != "debug_abbrev"    ) &&
		 ( section    != "debug_pubnames"  ) &&
		 ( section    != "debug_aranges"   ) &&
		 ( section    != "ARM.attributes"  ) &&
		 ( section    != "comment"         ) &&
		 ( section    != "debug_ranges"    ) &&
		 ( section    != "debug_pubtypes"  ) &&
		 ( size       != 0                 ) &&
		 ( decaddress != 0                 ) ) {
		if (all_ram) {
			area = "RAM";
			total_ram += size;
		} else {
			flash_section_name.forEach(function (value, index, array) {
				let start_section  = flash_section_start[index],
					length_section = flash_section_length[index],
					end_section    = start_section + length_section;
				if ((decaddress >= start_section) && (decaddress < end_section)) {
					area = "FLASH";
					total_flash += size;
				}
			})
			ram_section_name.forEach(function (value, index, array) {
				let start_section  = ram_section_start[index],
					length_section = ram_section_length[index],
					end_section    = start_section + length_section;
				if ((decaddress >= start_section) && (decaddress < end_section)) {
					area = "RAM";
					total_ram += size;
				}
			})
		}
	}
	if (area && size) {
		let module = process_section(area, section, size, modulefn, decaddress, hexaddress);
	}
}

// Process sections that are in both flash and ram due to having inital values load from flash into ram variables
// ie    : .data section
// sample: .data           0x20000000      0xc10 load address 0x08054af0

reg = /\n.(\S+)\s+0x(\S+)\s+0x(\S+) load address 0x(\S+)/gi;
while (content = reg.exec(file)) {
	let area = "FLASH",
		section = "RAM Initialisation - " + content[1],
		size = parseInt(content[3], 16),
		hexaddress = content[4],
		decaddress = parseInt(content[4], 16),
		modulefn = "";

	// if (decaddress < start_flash + length_flash) {
	// 	total_flash += size;

	// 	if (max_flash < decaddress + size) {
	// 		max_flash = decaddress + size;
	// 	}

	// 	if (warn && ((total_flash != (max_flash - start_flash)) && (flash_known_diff != ((max_flash - start_flash) - total_flash)))) {
	// 		flash_known_diff = (max_flash - start_flash) - total_flash;
	// 		console.log("WARNING: FLASH Max mismatch @ 0xhexaddress. Max Flash = " + (max_flash - start_flash) + ". Total Flash = total_flash.");
	// 	}
	// }
	if (size != 0) {
		let module = process_section(area, section, size, modulefn, decaddress, hexaddress);
	}
}

if (printall) {
	console.log();
}

// Get target name from map filename
console.log(get_target_name(filename));

print_module_totals();

// end-of-file
